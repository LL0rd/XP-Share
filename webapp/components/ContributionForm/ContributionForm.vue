<template>
  <div>
    <ds-form
      class="contribution-form"
      ref="contributionForm"
      v-model="formData"
      :schema="formSchema"
      @submit="submit"
    >
      <template #default="{ errors }">
        <base-card>
          <ds-grid>
            <ds-grid-item column-span="fullWidth" :row-span="2">
              <div class="event-grid-item">
                <!-- <label>Beginn</label> -->
                <div class="event-grid-item-z-helper">
                  <date-picker
                    name="xpDate"
                    v-model="formData.xpDate"
                    type="datetime"
                    value-type="format"
                    :minute-step="15"
                    Xformat="DD-MM-YYYY HH:mm"
                    class="event-grid-item-z-helper"
                    :placeholder="$t('post.viewEvent.xpDate')"
                    :show-second="false"
                    @change="changeXPDate($event)"
                  ></date-picker>
                </div>
                <div
                  v-if="errors && errors.eventStart"
                  class="chipbox event-grid-item-margin-helper"
                >
                  <ds-chip size="base" :color="errors && errors.eventStart && 'danger'">
                    <base-icon name="warning" />
                  </ds-chip>
                </div>
              </div>
            </ds-grid-item>
            <ds-grid-item column-span="fullWidth" :row-span="2">
              <ds-input
                model="title"
                :placeholder="$t('contribution.title')"
                name="title"
                autofocus
                size="large"
              />
              <ds-chip size="base" :color="errors && errors.title && 'danger'">
                {{ formData.title.length }}/{{ formSchema.title.max }}
                <base-icon v-if="errors && errors.title" name="warning" />
              </ds-chip>
            </ds-grid-item>
            <ds-grid-item column-span="fullWidth" :row-span="2">
              <ds-select
                v-model="tempXpType"
                :options="xpTypeOptions"
                placeholder="Category"
                size="large"
                >
                </ds-select>
            </ds-grid-item>
            <ds-grid-item column-span="fullWidth" :row-span="6">
              <editor
                :users="users"
                :value="formData.content"
                :hashtags="hashtags"
                @input="updateEditorContent"
                :showToolbar="false"
              />
              <ds-chip size="base" :color="errors && errors.content && 'danger'">
                {{ contentLength }}
                <base-icon v-if="errors && errors.content" name="warning" />
              </ds-chip>
            </ds-grid-item>
            <ds-grid-item column-span="fullWidth" :row-span="12">
              <div class="image-upload-section">
                <img
                  v-if="formData.image"
                  :src="formData.image | proxyApiUrl"
                  :class="['image', formData.imageBlurred && '--blur-image']"
                />
                <image-uploader
                  :hasImage="!!formData.image"
                  :class="[formData.imageBlurred && '--blur-image']"
                  @addHeroImage="addHeroImage"
                  @addImageAspectRatio="addImageAspectRatio"
                  @addImageType="addImageType"
                />
              </div>
              <div v-if="formData.image" class="blur-toggle">
                <label for="blur-img">{{ $t('contribution.inappropriatePicture') }}</label>
                <input type="checkbox" id="blur-img" v-model="formData.imageBlurred" />
                <page-params-link class="link" :pageParams="links.FAQ">
                  {{ $t('contribution.inappropriatePicture') }}
                  <base-icon name="question-circle" />
                </page-params-link>
              </div>
            </ds-grid-item>

            <div class="files-uploader">
              <div class="files-uploader__files">
                <div v-for="(file, index) in formData.files" class="files-uploader__files__item">
                  <p><base-icon name="paperclip" /> <span class="files-uploader__files__item__text">{{ file.name }}</span></p>
                  <base-button
                    class="delete-image-button"
                    icon="trash"
                    circle
                    danger
                    filled
                    data-test="delete-button"
                    :title="$t('actions.delete')"
                    @click.stop="deleteFile(index)"
                  />
                </div>
              </div>
            </div>

            <h3>
              {{ $t('fileAttachments') }}
            </h3>
            <multiple-file-uploader
              @selected="addFile"
            />

            <h3 style="margin-top: 40px">
              {{ $t('audio.recordings') }}
            </h3>
            <div v-if="formData.audio" class="audio-uploader">
              <audio :src="formData.audio.url" controls />
              <base-button
                class="delete-image-button"
                icon="trash"
                circle
                danger
                filled
                data-test="delete-button"
                :title="$t('actions.delete')"
                @click.prevent="deleteAudio"
              />
            </div>
            <div v-else class="audio-uploader">
              <audio-uploader @selected="addAudio" />
            </div>

            <h3 v-if="formData.drawing" class="label">
              {{ $t('whiteBoard.label') }}
            </h3>
            <div v-if="formData.drawing" class="delete-drawing">
              <img
                :src="formData.drawing.url"
                :class="['delete-drawing-image']"
              />
              <base-button
                class="delete-drawing-button"
                icon="trash"
                circle
                danger
                filled
                data-test="delete-button"
                :title="$t('actions.delete')"
                @click.prevent="deleteDrawing"
              />
            </div>
            <white-board-input v-else @drawing="handleDrawing" />
            <h3 style="margin-top: 40px">
              {{ $t('privacy') }}
            </h3>
            <ds-grid-item column-span="fullWidth" :row-span="1">
              <label for="anonymous">
              <input id="anonymous" type="checkbox" v-model="formData.isAno" :checked="formData.isAno" />
                {{ $t('contribution.anonymous') }}
              </label>
            </ds-grid-item>
            <ds-grid-item column-span="fullWidth" :row-span="1">
              <label for="private">
              <input id="private" type="checkbox" v-model="formData.isPrivate" :checked="formData.isPrivate" />
                {{ $t('contribution.private') }}
              </label>
            </ds-grid-item>
          </ds-grid>

          <!-- Eventdata -->
          <div v-if="createEvent" class="eventDatas">
            <hr />
            <ds-space margin-top="x-small" />

            <!-- Event Data -->
            <ds-grid>
              <ds-grid-item class="event-grid-item">
                <!-- <label>Beginn</label> -->
                <div class="event-grid-item-z-helper">
                  <date-picker
                    name="eventStart"
                    v-model="formData.eventStart"
                    type="datetime"
                    value-type="format"
                    :minute-step="15"
                    Xformat="DD-MM-YYYY HH:mm"
                    class="event-grid-item-z-helper"
                    :placeholder="$t('post.viewEvent.eventStart')"
                    :disabled-date="notBeforeToday"
                    :disabled-time="notBeforeNow"
                    :show-second="false"
                    @change="changeEventStart($event)"
                  ></date-picker>
                </div>
                <div
                  v-if="errors && errors.eventStart"
                  class="chipbox event-grid-item-margin-helper"
                >
                  <ds-chip size="base" :color="errors && errors.eventStart && 'danger'">
                    <base-icon name="warning" />
                  </ds-chip>
                </div>
              </ds-grid-item>
              <ds-grid-item class="event-grid-item">
                <!-- <label>Ende (optional)</label> -->

                <date-picker
                  v-model="formData.eventEnd"
                  name="eventEnd"
                  type="datetime"
                  value-type="format"
                  :minute-step="15"
                  :seconds-step="0"
                  Xformat="DD-MM-YYYY HH:mm"
                  :placeholder="$t('post.viewEvent.eventEnd')"
                  class="event-grid-item-font-helper"
                  :disabled-date="notBeforeEventDay"
                  :disabled-time="notBeforeEvent"
                  :show-second="false"
                  @change="changeEventEnd($event)"
                ></date-picker>
              </ds-grid-item>
            </ds-grid>
            <ds-grid class="event-location-grid">
              <ds-grid-item class="event-grid-item">
                <ds-input
                  model="eventVenue"
                  name="eventVenue"
                  :placeholder="$t('post.viewEvent.eventVenue')"
                />
                <div class="chipbox">
                  <ds-chip size="base" :color="errors && errors.eventVenue && 'danger'">
                    {{ formData.eventVenue.length }}/{{ formSchema.eventVenue.max }}
                    <base-icon v-if="errors && errors.eventVenue" name="warning" />
                  </ds-chip>
                </div>
              </ds-grid-item>
              <ds-grid-item v-if="showEventLocationName" class="event-grid-item">
                <ds-input
                  model="eventLocationName"
                  name="eventLocationName"
                  :placeholder="$t('post.viewEvent.eventLocationName')"
                />
                <div class="chipbox">
                  <ds-chip size="base" :color="errors && errors.eventLocationName && 'danger'">
                    {{ formData.eventLocationName.length }}/{{ formSchema.eventLocationName.max }}
                    <base-icon v-if="errors && errors.eventLocationName" name="warning" />
                  </ds-chip>
                </div>
              </ds-grid-item>
            </ds-grid>

            <div>
              <input
                type="checkbox"
                v-model="formData.eventIsOnline"
                model="eventIsOnline"
                name="eventIsOnline"
                class="event-grid-item-font-helper"
                @change="changeEventIsOnline($event)"
              />
              {{ $t('post.viewEvent.eventIsOnline') }}
            </div>
          </div>
          <ds-space margin-top="base" />
          <categories-select
            v-if="categoriesActive"
            model="categoryIds"
            :existingCategoryIds="formData.categoryIds"
          />
          <ds-chip
            v-if="categoriesActive"
            size="base"
            :color="errors && errors.categoryIds && 'danger'"
          >
            {{ formData.categoryIds.length }} / 3
            <base-icon v-if="errors && errors.categoryIds" name="warning" />
          </ds-chip>
          <ds-flex class="buttons-footer" gutter="xxx-small">
            <ds-flex-item width="3.5" class="buttons-footer-helper">
              <!-- eslint-disable vue/no-v-text-v-html-on-component -->
              <!-- TODO => remove v-html! only text ! no html! security first! -->
              <ds-text
                v-if="showGroupHint"
                v-html="$t('contribution.visibleOnlyForMembersOfGroup', { name: groupName })"
              />
              <!-- eslint-enable vue/no-v-text-v-html-on-component -->
            </ds-flex-item>
            <ds-flex-item width="0.15" />
            <ds-flex-item class="action-buttons-group" width="2">
              <base-button data-test="cancel-button" :disabled="loading" @click="$router.back()">
                {{ $t('actions.cancel') }}
              </base-button>
              <base-button type="submit" icon="check" :loading="loading" :disabled="errors" filled>
                {{ $t('actions.save') }}
              </base-button>
            </ds-flex-item>
          </ds-flex>
        </base-card>
      </template>
    </ds-form>
  </div>
</template>
<script>
import gql from 'graphql-tag'
import { mapGetters } from 'vuex'
import Editor from '~/components/Editor/Editor'
import PostMutations from '~/graphql/PostMutations.js'
import CategoriesSelect from '~/components/CategoriesSelect/CategoriesSelect'
import ImageUploader from '~/components/Uploader/ImageUploader'
import MultipleFileUploader from '~/components/Uploader/MultipleFileUploader'
import links from '~/constants/links.js'
import PageParamsLink from '~/components/_new/features/PageParamsLink/PageParamsLink.vue'
import DatePicker from 'vue2-datepicker'
import 'vue2-datepicker/scss/index.scss'
import { mapMutations } from 'vuex'
import FileMutations from '~/graphql/FileMutations'
import WhiteBoardInput from '~/components/WhiteBoardInput/WhiteBoardInput'
import AudioUploader from '~/components/Uploader/AudioUploader'

export default {
  components: {
    Editor,
    ImageUploader,
    PageParamsLink,
    CategoriesSelect,
    DatePicker,
    MultipleFileUploader,
    WhiteBoardInput,
    AudioUploader
  },
  props: {
    contribution: {
      type: Object,
      default: () => ({}),
    },
    group: {
      type: Object,
      default: () => null,
    },
    createEvent: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    const {
      title,
      subtitle,
      xpType,
      isPrivate,
      isAno,
      isEncrypted,
      xpDate,
      content,
      image,
      files,
      categories,
      eventStart,
      eventEnd,
      eventLocationName,
      eventVenue,
      eventIsOnline,
      eventLocation,
      drawing,
      audio
    } = this.contribution
    const {
      sensitive: imageBlurred = false,
      aspectRatio: imageAspectRatio = null,
      type: imageType = null,
    } = image || {}
    return {
      categoriesActive: this.$env.CATEGORIES_ACTIVE,
      links,
      formData: {
        title: title || '',
        subtitle: subtitle || '',
        xpType: xpType || '',
        isPrivate: isPrivate || false,
        isAno: isAno || false,
        isEncrypted: isEncrypted || false,
        xpDate: xpDate || '',
        content: content || '',
        image: image || null,
        drawing: drawing || null,
        audio: audio || null,
        files: files || [],
        imageAspectRatio,
        imageType,
        imageBlurred,
        categoryIds: categories ? categories.map((category) => category.id) : [],
        eventStart: eventStart || null,
        eventEnd: eventEnd || null,
        eventLocation: eventLocation || '',
        eventLocationName: eventLocationName || '',
        eventVenue: eventVenue || '',
        eventIsOnline: eventIsOnline || false,
      },
      loading: false,
      users: [],
      hashtags: [],
      imageUpload: null,
      fileUploads: [],
      drawingUpload: null,
      audioUpload: null,
      tempXpType: null,
      xpTypeOptions: [
          {
            label: this.$t("contribution.dream"),
            value: 'contribution.dream'
          },
          {
            label: this.$t('contribution.nature'),
            value: 'contribution.nature'
          },
          {
            label: this.$t('contribution.meditation'),
            value: 'contribution.meditation'
          },
          {
            label: this.$t('contribution.nde'),
            value: 'contribution.nde'
          },
          {
            label: this.$t('contribution.sky'),
            value: 'contribution.sky'
          },
          {
            label: this.$t('contribution.psycho'),
            value: 'contribution.psycho'
          },
          {
            label: this.$t('contribution.supernatural'),
            value: 'contribution.supernatural'
          },
        ]

    }
  },
  async mounted() {
    await import(`vue2-datepicker/locale/${this.currentUser.locale}`)
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    formSchema() {
      return {
        title: { required: true, min: 3, max: 100 },
        subtitle: { required: false, min: 3, max: 100 },
        xpType: { required: false },
        content: { required: true },
        imageBlurred: { required: false },
        categoryIds: {
          type: 'array',
          required: this.categoriesActive,
          validator: (_, value = []) => {
            if (this.categoriesActive && (value.length === 0 || value.length > 3)) {
              return [new Error(this.$t('common.validations.categories'))]
            }
            return []
          },
        },
        eventStart: { required: !!this.createEvent },
        eventVenue: {
          required: !!this.createEvent,
          min: 3,
          max: 100,
          validator: (_, value = '') => {
            if (!this.createEvent) return []
            if (!value.trim()) {
              return [new Error(this.$t('common.validations.eventVenueNotEmpty'))]
            }
            if (value.length < 3 || value.length > 100) {
              return [
                new Error(this.$t('common.validations.eventVenueLength', { min: 3, max: 100 })),
              ]
            }
            return []
          },
        },
        eventLocationName: {
          required: !!this.createEvent && !this.formData.eventIsOnline,
          min: 3,
          max: 100,
          validator: (_, value = '') => {
            if (!this.createEvent) return []
            if (this.formData.eventIsOnline) return []
            if (!value.trim()) {
              return [new Error(this.$t('common.validations.eventLocationNameNotEmpty'))]
            }
            if (value.length < 3 || value.length > 100) {
              return [
                new Error(
                  this.$t('common.validations.eventLocationNameLength', { min: 3, max: 100 }),
                ),
              ]
            }
            return []
          },
        },
      }
    },
    eventInput() {
      if (this.createEvent) {
        return {
          eventStart: this.formData.eventStart,
          eventVenue: this.formData.eventVenue,
          eventEnd: this.formData.eventEnd,
          eventIsOnline: this.formData.eventIsOnline,
          eventLocationName: !this.formData.eventIsOnline ? this.formData.eventLocationName : null,
        }
      }
      return undefined
    },
    contentLength() {
      return this.$filters.removeHtml(this.formData.content).length
    },
    groupId() {
      return this.group && this.group.id
    },
    showGroupHint() {
      return this.groupId && ['closed', 'hidden'].includes(this.group.groupType)
    },
    groupName() {
      return this.group && this.group.name
    },
    groupCategories() {
      return this.group && this.group.categories
    },
    showEventLocationName() {
      return !this.formData.eventIsOnline
    },
  },
  watch: {
    groupCategories() {
      if (!this.formData.categoryIds.length && this.groupCategories)
        this.formData.categoryIds = this.groupCategories.map((cat) => cat.id)
    },
    tempXpType(val) {
      this.formData.xpType = val.value;
    }
  },
  methods: {
    notBeforeToday(date) {
      return date < new Date().setHours(0, 0, 0, 0)
    },
    notBeforeNow(date) {
      return date < new Date()
    },
    notBeforeEventDay(date) {
      return date < new Date(this.formData.eventStart).setHours(0, 0, 0, 0)
    },
    notBeforeEvent(date) {
      return date <= new Date(this.formData.eventStart)
    },
    submit() {
      let image = null
      let drawing = null
      let audio = null
      let files = []

      const { title, subtitle, content, categoryIds, xpType, isPrivate, isAno, isEncrypted, xpDate } =
        this.formData
      if (this.formData.image) {
        image = {
          sensitive: this.formData.imageBlurred,
        }
        if (this.imageUpload) {
          image.upload = this.imageUpload
          image.aspectRatio = this.formData.imageAspectRatio
          image.type = this.formData.imageType
        }
      }

      if (!this.formData.drawing && this.drawingUpload) {
        drawing = this.drawingUpload
      }

      if (!this.formData.audio && this.audioUpload) {
        audio = this.audioUpload
      }

      if (this.fileUploads.length) {
        this.fileUploads.forEach((file, index) => {
          files[index] = {}
          files[index].upload = file[0]
          files[index].type = file[0].type
          files[index].name = file[0].name
          files[index].alt = file[0].name
        })
      }

      this.loading = true

      this.$apollo
        .mutate({
          mutation: this.contribution.id ? PostMutations().UpdatePost : PostMutations().CreatePost,
          variables: {
            title,
            subtitle,
            xpType,
            isPrivate,
            isAno,
            isEncrypted,
            xpDate,
            content,
            categoryIds,
            id: this.contribution.id || null,
            image,
            files,
            ...((!this.formData.drawing || this.drawingUpload) && { drawing } ),
            ...((!this.formData.audio || this.audioUpload) && { audio } ),
            groupId: this.groupId,
            postType: !this.createEvent ? 'Article' : 'Event',
            eventInput: this.eventInput,
          },
        })
        .then(({ data }) => {
          this.loading = false
          this.$toast.success(this.$t('contribution.success'))
          const result = data[this.contribution.id ? 'UpdatePost' : 'CreatePost']

          this.$router.push({
            name: 'post-id-slug',
            params: { id: result.id, slug: result.slug },
          })
        })
        .catch((err) => {
          this.$toast.error(err.message)
          this.loading = false
        })
    },
    updateEditorContent(value) {
      this.$refs.contributionForm.update('content', value)
    },
    changeEventIsOnline(event) {
      this.$refs.contributionForm.update('eventIsOnline', this.formData.eventIsOnline)
    },
    changeEventEnd(event) {
      this.$refs.contributionForm.update('eventEnd', event)
    },
    changeEventStart(event) {
      this.$refs.contributionForm.update('eventStart', event)
    },
    changeXPDate(event) {
      this.$refs.contributionForm.update('xpDate', event)
    },
    addHeroImage(file) {
      this.formData.image = null
      if (file) {
        const reader = new FileReader()
        reader.onload = ({ target }) => {
          this.formData.image = {
            ...this.formData.image,
            url: target.result,
          }
        }
        reader.readAsDataURL(file)
        this.imageUpload = file
      }
    },
    deleteDrawing() {
      if (this.formData.drawing) {
        this.formData.drawing = null
      }
    },
    deleteAudio() {
      if (this.formData.audio) {
        this.formData.audio = null
      }
    },
    addFile(files) {
      files.forEach((file,index) => {
        this.fileUploads[index] = file
      })
    },
    addAudio(file) {
      // const reader = new FileReader();
      // reader.readAsDataURL(file);
      this.audioUpload = file
    },
    addImageAspectRatio(aspectRatio) {
      this.formData.imageAspectRatio = aspectRatio
    },
    addImageType(imageType) {
      this.formData.imageType = imageType
    },
    ...mapMutations({
      commitModalData: 'modal/SET_OPEN',
    }),
    modalData(item) {
      return {
        name: 'confirm',
        data: {
          type: 'File',
          resource: item,
          modalData: {
            titleIdent: 'delete.file.title',
            messageIdent: 'delete.file.message',
            messageParams: {
              name: item.name,
            },
            buttons: {
              confirm: {
                danger: true,
                icon: 'trash',
                textIdent: 'delete.submit',
                callback: () => {
                  this.deleteFileCallback(item.id)
                },
              },
              cancel: {
                icon: 'close',
                textIdent: 'delete.cancel',
                callback: () => {},
              },
            },
          },
        }
      }
    },
    async deleteFileCallback(id) {
      try {
        const {
          data: { DeleteFile },
        } = await this.$apollo.mutate({
          mutation: FileMutations(this.$i18n).DeleteFile,
          variables: { id },
        })
        this.$toast.success(this.$t('delete.file.success'))
        this.formData.files = this.formData.files.filter((file) => !file.id || (file.id && file.id !== id))
      } catch (err) {
        this.$toast.error(err.message)
      }
    },
    async openModal(data) {
      await this.commitModalData(this.modalData(data))
    },
    async deleteFile(index) {
      if(this.formData.files[index].id) {
        await this.openModal(this.formData.files[index])
      } else {
        this.formData.files.splice(index, 1)
      }
    },
    handleDrawing(base64Image) {
      let image;
      const base64WithoutPrefix = base64Image.replace(/^data:[^;]+;base64,/, '');
      const byteCharacters = atob(base64WithoutPrefix);
      const byteArrays = [];

      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);

          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
              byteNumbers[i] = slice.charCodeAt(i);
          }

          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
      }

      const blob = new Blob(byteArrays, { type: 'image/png' });
      const upload = new File([blob], 'drawing.png', { type: 'image/png' });

      const reader = new FileReader();
      reader.readAsDataURL(upload);
      this.drawingUpload = upload;
    }
  },
  apollo: {
    User: {
      query() {
        return gql`
          query {
            User(orderBy: slug_asc) {
              id
              slug
            }
          }
        `
      },
      result({ data: { User } }) {
        this.users = User
      },
    },
    Tag: {
      query() {
        return gql`
          query {
            Tag(orderBy: id_asc) {
              id
            }
          }
        `
      },
      result({ data: { Tag } }) {
        this.hashtags = Tag
      },
    },
  },
}
</script>

<style lang="scss">
.eventDatas {
  .chipbox {
    display: flex;
    justify-content: flex-end;

    > .ds-chip {
      margin-top: -10px;
    }
  }
  // style override to handle dynamic inputs
  .event-location-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  .event-grid-item {
    // important needed because of component inline style
    grid-row-end: span 3 !important;
  }
  .event-grid-item-z-helper {
    z-index: 20;
  }
  .event-grid-item-margin-helper {
    margin-top: 10px;
  }
  .event-grid-item-font-helper {
    font-size: larger;
  }
}

.contribution-form .base-card {
  display: flex;
  flex-direction: column;

  > .hero-image {
    position: relative;

    > .image {
      max-height: $size-image-max-height;
    }
  }

  .image.--blur-image {
    filter: blur($blur-radius);
  }

  > .ds-form-item {
    margin: 0;
  }

  > .ds-chip {
    align-self: flex-end;
    margin: $space-xx-small 0 $space-base;
    cursor: default;
  }

  > .select-field {
    align-self: flex-end;
  }

  > .buttons-footer {
    justify-content: flex-end;
    align-self: flex-end;
    width: 100%;
    margin-top: $space-base;

    > .action-buttons-group {
      margin-left: auto;
      display: flex;
      justify-content: flex-end;

      > button {
        margin-left: 1em;
        min-width: fit-content;
      }
    }

    > .buttons-footer-helper {
      margin-right: 16px;
      // important needed because of component inline style
      margin-bottom: 6px !important;
    }
  }

  .blur-toggle {
    text-align: right;
    margin-bottom: $space-base;

    > .link {
      display: block;
    }
  }

  @media screen and (max-width: 656px) {
    > .buttons-footer {
      flex-direction: column;
      margin-top: 5px;

      > .action-buttons-group {
        > button {
          margin-left: 1em;
        }
      }
    }
  }

  @media screen and (max-width: 280px) {
    > .buttons-footer {
      > .action-buttons-group {
        flex-direction: column;

        > button {
          margin-bottom: 5px;
        }
      }
    }
  }

  .mx-datepicker {
    width: 100%;
  }
  .mx-datepicker input {
    font-size: 1rem;
    height: calc(1.625rem + 18px);
    padding: 8px 8px;
    background-color: #faf9fa;
    border-color: #c8c8c8;
    color: #4b4554;
  }
  .mx-datepicker input:hover {
    border-color: #c8c8c8;
  }
  .mx-datepicker input:focus {
    background-color: #fff;
  }
  .mx-datepicker-error {
    border-color: #cf2619;
  }
}

.image-upload-section {
  height: 400px;
  overflow: hidden;
  position: relative;

  img {
    width: 100%;
  }

  .image-uploader {
    height: 400px;
  }
}

.contribution-form {
  .base-card {
    display: flex;
    flex-direction: column;

    .ds-form-item {
      margin: 0;
    }

    .ds-chip {
      float: right;
      margin: $space-xx-small 0 $space-base;
      cursor: default;
    }
  }
}

.ds-grid {
  grid-auto-rows: auto !important;
}

.files-uploader {
  grid-column: 1 / -1; /* Span all columns */
  align-self: auto;
  margin-top: 60px;
  position: relative;

  &__files {
    width: 100%;
    display: flex;
    flex-direction: column;

    &__item {
      border-radius: 4px;
      margin-bottom: 4px;
      width: 100%;
      padding: 8px 20px;
      border: 2px solid #efeef1;
      display: flex;
      justify-content: space-between;
      align-items: center;

      & > p {
        margin-bottom: 0;
        display: flex;
        align-items: center;
        width: 80%;

        & svg {
          margin-right: 8px;
        }
      }

      &__text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}

.delete-drawing {
  grid-column: 1 / -1; /* Span all columns */
  align-self: auto;
  position: relative;
  background: #efeef1;
}

.delete-drawing-button {
  position: absolute;
  top: 8px;
  right: 20px;
}

.delete-drawing-image {
  width: 100%;
  height: auto;

  &:hover {
    opacity: 0.6;
  }
}

.label {
  width: 100%;
  background: #fff;
}

.audio-uploader {
  width: 100%;
  display: flex;
  grid-column: 1 / -1;
  align-self: auto;
  justify-content: center;
  align-items: center;

  & > * + * {
    margin-left: 8px;
  }
}
</style>
