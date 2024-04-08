<template>
  <div class="multiple-file-uploader">
    <div class="multiple-file-uploader__files">
      <div v-for="(file, index) in previewFiles" class="multiple-file-uploader__files__item">
        <p><base-icon name="paperclip" /> <span class="multiple-file-uploader__files__item__text">{{ file }}</span></p>
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
    <input
      style="display: none"
      id="input-file"
      type="file"
      :accept="accept || '*'"
      multiple
      @change="addMedia"
      class="_add-media-input"
      ref="input"
    />
    <label for="input-file">
      <slot :openFileDialog="openFileDialog">
        <base-button filled @click="openFileDialog" class="multiple-file-uploader__button">
          Attach Files
        </base-button>
      </slot>
    </label>
  </div>
</template>

<script>
  export default {
    props: {
      accept: { type: String },
    },
    data() {
      return {
        files: [],
        previewFiles: []
      }
    },
    methods: {
      async addMedia(event) {
        const files = event.target.files || event.dataTransfer.files;
        if (!files.length) return;
        this.files.push(files);
        this.$emit("selected", this.files);

        this.previewFiles = []

        this.files.forEach(file => {
          this.previewFiles.push(file[0].name);
        });
      },

      openFileDialog() {
        this.$refs.input.click();
      },
      deleteFile(index) {
        this.previewFiles.splice(index, 1)
        this.files.splice(index, 1)
        this.$emit("selected", this.files)
      }
    }
  }
</script>

<style lang="scss" scoped>
.multiple-file-uploader {
  grid-column: 1 / -1; /* Span all columns */
  align-self: auto;

  &__files {
    width: 100%;
    display: flex;
    flex-direction: column;
    margin-bottom: 24px;

    &__item {
      border-radius: 4px;
      margin-bottom: 4px;
      width: 100%;
      padding: 8px 20px;
      background: #efeef1;
      display: flex;
      justify-content: space-between;
      border: 2px solid #e5e3e8;
      align-items: center;

      & > p {
        margin-bottom: 0;
        display: flex;
        align-items: center;
        width: 80%;

        & > .base-icon {
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
</style>
