<template>
  <div class="container">
    <div class="header">
      <h3 class="label">
        {{ $t('whiteBoard.label') }}
      </h3>
      <div class="buttons">
        <base-button @click.prevent="clear">Clear</base-button>
        <base-button @click.prevent="undo" icon="undo"> Undo </base-button>
      </div>
    </div>
    <client-only>
      <vue-signature ref="signature" id="signature" :sigOption="options" :disabled="disabled" @afterUpdateStroke="save"></vue-signature>
    </client-only>
  </div>
</template>

<script>
export default {
  name: 'WhiteBoardInput',
  props: {
    disabled: {
      type: Boolean,
      default: false
    },
  },
  data() {
    return {
      options: {
        penColor: "#000",
        backgroundColor: "rgb(255,255,255)",
        minWidth: 1.5,
        maxWidth: 1.5,
      },
    }
  },
  methods: {
    save() {
      const image = this.$refs.signature.save();
      this.$emit('drawing', image)
    },
    clear() {
      this.$refs.signature.clear();
    },
    undo() {
      this.$refs.signature.undo();
    },
  },
}
</script>

<style lang="scss" scoped>
#signature {
  border: 2px solid #c8c8c8;
  border-radius: 8px;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.container {
  grid-column: 1 / -1; /* Span all columns */
  align-self: auto;
  width: "100%";
  margin-top: 24px;
  aspect-ratio: 16/9;
  position: relative;
}

.buttons {
  display: flex;
  margin-bottom: 8px;
  justify-content: flex-end;
  width: 100%;

  & > * + * {
    margin-left: 4px;
  }
}
</style>
