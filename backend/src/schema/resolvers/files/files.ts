import path from 'path'
import { v4 as uuid } from 'uuid'
import { Upload } from '@aws-sdk/lib-storage'
import { ObjectCannedACL, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import slug from 'slug'
import { existsSync, unlinkSync, createWriteStream } from 'fs'
import CONFIG from '../../../config'

const { AWS_ENDPOINT: endpoint, AWS_REGION: region, AWS_BUCKET: Bucket, S3_CONFIGURED, AWS_ACCESS_KEY_ID: accessKeyId, AWS_SECRET_ACCESS_KEY: secretAccessKey } = CONFIG

const s3 = new S3Client({
  region,
  endpoint,
  // For local development use only.
  // Uncomment this and add localstack to point to 127.0.0.1 in hosts file
  // endpoint: {
  //   protocol: 'http:',
  //   hostname: 'localstack:4566',
  //   path: '/',
  // },
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true
})

export async function deleteFile (file) {
  const deleteCallback = S3_CONFIGURED ? s3Delete : localFileDelete
  const { url } = file
  deleteCallback(url)
  console.log(url)
  return url
}

export async function uploadFile (upload) {
  if (!upload) return undefined
  const uploadCallback = S3_CONFIGURED ? s3Upload : localFileUpload
  const { createReadStream, filename, mimetype } = await upload
  const { name, ext } = path.parse(filename)
  const uniqueFilename = `${uuid()}-${slug(name)}${ext}`
  return uploadCallback({ createReadStream, uniqueFilename, mimetype })
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
  let { pathname } = new URL(url, 'http://example.org')
  pathname = pathname.substring(1)
  const params = {
    Bucket,
    Key: pathname,
  }

  try {
    const data = await s3.send(new DeleteObjectCommand(params));
    console.log("Success! Object deleted.", data);
    return data;
  } catch (err) {
    console.log("Error", err);
  }
}
