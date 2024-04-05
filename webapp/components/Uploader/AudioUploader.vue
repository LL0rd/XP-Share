<template>
  <div class="audio-file-uploader">
    <div v-if="file" class="audio-file-uploader__preview">
      <audio ref="audioPreview" controls />
      <base-button
        class="delete-image-button"
        icon="trash"
        circle
        danger
        filled
        data-test="delete-button"
        :title="$t('actions.delete')"
        @click.stop="deleteFile"
      />
    </div>

    <label v-else for="input-file" class="audio-file-uploader__buttons">
      <base-button icon="file" filled @click="openFileDialog" class="multiple-file-uploader__button">
        {{ $t('audio.browse') }}
      </base-button>
      <span>or</span>
      <base-button icon="microphone" filled @click="recordAudio" :danger="isRecording" class="multiple-file-uploader__button">
        {{ isRecording ? $t('audio.stopRecord') : $t('audio.startRecord') }}
      </base-button>
    </label>
    <input
      style="display: none"
      id="input-file"
      type="file"
      :accept="accept || 'audio/*'"
      @change="addMedia"
      class="audio-file-uploader__input"
      ref="input"
      :key="inputKey"
    />
  </div>
</template>

<script>
  export default {
    props: {
      accept: { type: String },
    },
    data() {
      return {
        file: null,
        previewFile: null,
        inputKey: 0,
        isRecording: false,
      }
    },
    methods: {
      previewAudio(){
        let audio = this.$refs.audioPreview
        let reader = new FileReader();

        reader.readAsDataURL(this.file);
        reader.addEventListener('load', function(){
          audio.src = reader.result;
        });
      },
      async addMedia(event) {
        const audioFile = event.target.files[0];
        this.file = audioFile
        this.$nextTick(() => {
          this.previewAudio();
        })
        this.$emit("selected", this.file);
      },

      openFileDialog() {
        this.$refs.input.click();
        this.inputKey += 1
      },
      async recordAudio() {
        if (window.recorder && window.recorder.state === "recording"){
          window.recorder.stop();
        }
        else {
          let stream = await navigator.mediaDevices.getUserMedia({audio: true, video: false });
          window.recorder = new MediaRecorder(stream);

          let chunks = [];
          const _this = this
          window.recorder.ondataavailable = function(event){
            if (event.data.size <= 0) {return;}
            chunks.push(event.data);
          };

          window.recorder.onstart = function(){
            _this.isRecording = true;
          };


          window.recorder.onstop = function(){
            let blob = new Blob(chunks, { type: 'audio/mp3' });
            _this.isRecording = false;
            // let tracks = stream.getTracks();
            // tracks.forEach(track => track.stop());
            _this.file = new File([blob], 'recording.mp3', { type: 'audio/mp3' })
            _this.$nextTick(() => {
              _this.previewAudio()
              _this.$emit("selected", _this.file);
            })
          };
          window.recorder.start();
        }
      },
      deleteFile() {
        this.file = null
        this.$emit("selected", this.file);
      }
    }
  }
</script>

<style lang="scss" scoped>
.audio-file-uploader {
  grid-column: 1 / -1; /* Span all columns */
  align-self: auto;

  &__preview {
    display: flex;
    justify-content: center;
    align-items: center;

    & > * + * {
      margin-left: 8px;
    }
  }

  &__buttons {
    & > * + * {
      margin-left: 8px;
    }
    display: flex;
    align-items: center;
  }
}
</style>
