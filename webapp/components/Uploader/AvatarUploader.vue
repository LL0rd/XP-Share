<template>
  <div class="avatar-uploader">
    <vue-dropzone
      id="customdropzone"
      :key="avatarUrl"
      ref="el"
      :use-custom-slot="true"
      :options="dropzoneOptions"
      @vdropzone-error="verror"
    >
      <div class="dz-message" @mouseover="hover = true" @mouseleave="hover = false">
        <slot></slot>
        <div class="avatar-attachments-upload-area">
          <div class="avatar-drag-marker">
            <base-icon v-if="hover" name="image" />
          </div>
        </div>
      </div>
    </vue-dropzone>
  </div>
</template>
<script>
import vueDropzone from 'nuxt-dropzone'

export default {
  name: 'AvatarUploader',
  components: {
    vueDropzone,
  },
  props: {
    profile: { type: Object, required: true },
    updateMutation: { type: Function, required: true },
  },
  data() {
    return {
      dropzoneOptions: {
        url: this.vddrop,
        maxFilesize: 5.0,
        previewTemplate: this.template(),
      },
      error: false,
      hover: false,
    }
  },
  computed: {
    avatarUrl() {
      const { avatar } = this.profile
      return avatar && avatar.url
    },
  },
  watch: {
    error() {
      const that = this
      setTimeout(function () {
        that.error = false
      }, 2000)
    },
  },
  methods: {
    template() {
      return `<div class="dz-preview dz-file-preview">
                <div class="dz-image">
                  <div data-dz-thumbnail-bg></div>
                </div>
              </div>
      `
    },
    vddrop(file) {
      const avatarUpload = file[0]
      this.$apollo
        .mutate({
          mutation: this.updateMutation(),
          variables: {
            avatar: {
              upload: avatarUpload,
            },
            id: this.profile.id,
          },
        })
        .then(() => {
          this.$toast.success(this.$t('profile.avatar.submitted'))
        })
        .catch((error) => this.$toast.error(error.message))
    },
    verror(file, message) {
      if (file.status === 'error') {
        this.error = true
        this.$toast.error(file.status, message)
      }
    },
  },
}
</script>
<style lang="scss">
#customdropzone .dz-preview {
  transition: all 0.2s ease-out;
  width: 160px;
  display: flex;
}

#customdropzone .dz-preview .dz-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  overflow: hidden;
}

#customdropzone .dz-preview .dz-image > div {
  width: inherit;
  height: inherit;
  border-radius: 50%;
  background-size: cover;
}

#customdropzone .dz-preview .dz-image > img {
  width: 100%;
}

.avatar-attachments-upload-area {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.avatar-attachments-upload-button {
  pointer-events: none;
}

.avatar-drag-marker {
  position: relative;
  width: 122px;
  height: 122px;
  border-radius: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: hsl(0, 0%, 25%);
  transition: all 0.2s ease-out;
  font-size: 60px;
  margin: -120px auto 5px;

  background-color: rgba(255, 255, 255, 0.3);
  opacity: 0.1;

  &:before {
    position: absolute;
    content: '';
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    border-radius: 100%;
    border: 20px solid rgba(255, 255, 255, 0.4);
    visibility: hidden;
  }

  &:after {
    position: absolute;
    content: '';
    top: 10px;
    left: 10px;
    bottom: 10px;
    right: 10px;
    border-radius: 100%;
    border: 1px dashed hsl(0, 0%, 25%);
  }
  .avatar-attachments-upload-area:hover & {
    opacity: 1;
  }
}
</style>
