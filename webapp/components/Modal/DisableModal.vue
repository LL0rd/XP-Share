<template>
  <ds-modal :title="title" :is-open="isOpen" @cancel="cancel">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <p v-html="message" />

    <template slot="footer">
      <base-button class="cancel" @click="cancel">{{ $t('disable.cancel') }}</base-button>
      <base-button danger filled class="confirm" icon="exclamation-circle" @click="confirm">
        {{ $t('disable.submit') }}
      </base-button>
    </template>
  </ds-modal>
</template>

<script>
import gql from 'graphql-tag'

export default {
  name: 'DisableModal',
  props: {
    name: { type: String, default: '' },
    type: { type: String, required: true },
    id: { type: String, required: true },
  },
  data() {
    return {
      isOpen: true,
      success: false,
      loading: false,
    }
  },
  computed: {
    title() {
      return this.$t(`disable.${this.type}.title`)
    },
    message() {
      const name = this.$filters.truncate(this.name, 30)
      return this.$t(`disable.${this.type}.message`, { name })
    },
  },
  methods: {
    async cancel() {
      // TODO: Use the "modalData" structure introduced in "ConfirmModal" and refactor this here. Be aware that all the Jest tests have to be refactored as well !!!
      // await this.modalData.buttons.cancel.callback()
      this.isOpen = false
      setTimeout(() => {
        this.$emit('close')
      }, 1000)
    },
    async confirm() {
      try {
        // TODO: Use the "modalData" structure introduced in "ConfirmModal" and refactor this here. Be aware that all the Jest tests have to be refactored as well !!!
        // await this.modalData.buttons.confirm.callback()
        await this.$apollo.mutate({
          mutation: gql`
            mutation ($resourceId: ID!, $disable: Boolean, $closed: Boolean) {
              review(resourceId: $resourceId, disable: $disable, closed: $closed) {
                disable
              }
            }
          `,
          variables: { resourceId: this.id, disable: true, closed: false },
        })
        this.$toast.success(this.$t('disable.success'))
        this.isOpen = false
        setTimeout(() => {
          this.$emit('close')
        }, 1000)
      } catch (err) {
        this.$toast.error(err.message)
        this.isOpen = false
      }
    },
  },
}
</script>
