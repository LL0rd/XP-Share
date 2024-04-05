import path from 'path'
import { v4 as uuid } from 'uuid'
import { Upload } from '@aws-sdk/lib-storage'
import { ObjectCannedACL, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import slug from 'slug'
import { existsSync, unlinkSync, createWriteStream } from 'fs'
import { UserInputError } from 'apollo-server'
import { getDriver } from '../../../db/neo4j'
import CONFIG from '../../../config'

// const widths = [34, 160, 320, 640, 1024]
const { AWS_ENDPOINT: endpoint, AWS_REGION: region, AWS_BUCKET: Bucket, S3_CONFIGURED, AWS_ACCESS_KEY_ID: accessKeyId, AWS_SECRET_ACCESS_KEY: secretAccessKey } = CONFIG

const s3 = new S3Client({
  region,
  // endpoint,
  // For local development use only.
  // Uncomment this and add localstack to point to 127.0.0.1 in hosts file
  endpoint: {
    protocol: 'http:',
    hostname: 'localstack:4566',
    path: '/',
  },
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true
})

export async function deleteImage(resource, relationshipType, opts: any = {}) {
  sanitizeRelationshipType(relationshipType)
  const { transaction, deleteCallback } = opts
  if (!transaction) return wrapTransaction(deleteImage, [resource, relationshipType], opts)
  const txResult = await transaction.run(
    `
    MATCH (resource {id: $resource.id})-[rel:${relationshipType}]->(image:Image)
    WITH image, image {.*} as imageProps
    DETACH DELETE image
    RETURN imageProps
  `,
    { resource },
  )
  const [image] = txResult.records.map((record) => record.get('imageProps'))
  // This behaviour differs from `mergeImage`. If you call `mergeImage`
  // with metadata for an image that does not exist, it's an indicator
  // of an error (so throw an error). If we bulk delete an image, it
  // could very well be that there is no image for the resource.
  if (image) deleteImageFile(image, deleteCallback)
  return image
}

export async function mergeImage(resource, relationshipType, imageInput, opts: any = {}) {
  if (typeof imageInput === 'undefined') return
  if (imageInput === null) return deleteImage(resource, relationshipType, opts)
  sanitizeRelationshipType(relationshipType)
  const { transaction, uploadCallback, deleteCallback } = opts
  if (!transaction)
    return wrapTransaction(mergeImage, [resource, relationshipType, imageInput], opts)

  let txResult
  txResult = await transaction.run(
    `
    MATCH (resource {id: $resource.id})-[:${relationshipType}]->(image:Image)
    RETURN image {.*}
    `,
    { resource },
  )
  const [existingImage] = txResult.records.map((record) => record.get('image'))
  const { upload } = imageInput
  if (!(existingImage || upload)) throw new UserInputError('Cannot find image for given resource')
  if (existingImage && upload) deleteImageFile(existingImage, deleteCallback)
  const url = await uploadImageFile(upload, uploadCallback)
  const { alt, sensitive, aspectRatio, type } = imageInput
  const image = { alt, sensitive, aspectRatio, url, type }
  txResult = await transaction.run(
    `
    MATCH (resource {id: $resource.id})
    MERGE (resource)-[:${relationshipType}]->(image:Image)
    ON CREATE SET image.createdAt = toString(datetime())
    ON MATCH SET image.updatedAt = toString(datetime())
    SET image += $image
    RETURN image {.*}
    `,
    { resource, image },
  )
  const [mergedImage] = txResult.records.map((record) => record.get('image'))
  return mergedImage
}

const wrapTransaction = async (wrappedCallback, args, opts) => {
  const session = getDriver().session()
  try {
    const result = await session.writeTransaction(async (transaction) => {
      return wrappedCallback(...args, { ...opts, transaction })
    })
    return result
  } finally {
    session.close()
  }
}

const deleteImageFile = (image, deleteCallback) => {
  if (!deleteCallback) {
    deleteCallback = S3_CONFIGURED ? s3Delete : localFileDelete
  }
  const { url } = image
  deleteCallback(url)
  return url
}

const uploadImageFile = async (upload, uploadCallback) => {
  if (!upload) return undefined
  if (!uploadCallback) {
    uploadCallback = S3_CONFIGURED ? s3Upload : localFileUpload
  }
  const { createReadStream, filename, mimetype } = await upload
  const { name, ext } = path.parse(filename)
  const uniqueFilename = `${uuid()}-${slug(name)}${ext}`
  return uploadCallback({ createReadStream, uniqueFilename, mimetype })
}

const sanitizeRelationshipType = (relationshipType) => {
  // Cypher query language does not allow to parameterize relationship types
  // See: https://github.com/neo4j/neo4j/issues/340
  if (!['HERO_IMAGE', 'AVATAR_IMAGE'].includes(relationshipType)) {
    throw new Error(`Unknown relationship type ${relationshipType}`)
  }
}

const localFileUpload = ({ createReadStream, uniqueFilename }) => {
  const destination = `/uploads/${uniqueFilename}`
  return new Promise((resolve, reject) =>
    createReadStream().pipe(
      createWriteStream(`public${destination}`)
        .on('finish', () => resolve(destination))
        .on('error', (error) => reject(error)),
    ),
  )
}

const s3Upload = async ({ createReadStream, uniqueFilename, mimetype }) => {
  const s3Location = `original/${uniqueFilename}`

  const params = {
    Bucket,
    Key: s3Location,
    ACL: ObjectCannedACL.public_read,
    ContentType: mimetype,
    Body: createReadStream(),
  }

  try {
    const parallelUploads3 = new Upload({ client: s3, params })

    parallelUploads3.on("httpUploadProgress", (progress) => {
      console.log(progress);
    });

    const data = await parallelUploads3.done();

    const { Location } = data
    return Location
  } catch (e) {
    console.log(e);
  }
}

const localFileDelete = async (url) => {
  const location = `public${url}`
  if (existsSync(location)) unlinkSync(location)
}

const s3Delete = async (url) => {
  console.log(url)
  let { pathname } = new URL(url, 'http://example.org') // dummy domain to avoid invalid URL error
  pathname = pathname.substring(1) // remove first character '/'
  const params = {
    Bucket,
    Key: pathname,
  }

  try {
    const data = await s3.send(new DeleteObjectCommand(params));
    console.log("Success. Object deleted.", data);
    return data; // For unit tests.
  } catch (err) {
    console.log("Error", err);
  }
}
