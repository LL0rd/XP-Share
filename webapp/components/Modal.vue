<template>
  <div class="modal-wrapper">
    <!-- Todo: Put all modals with 2 buttons and equal properties in one customiced 'danger-action-modal' -->
    <disable-modal
      v-if="open === 'disable'"
      :id="data.resource.id"
      :type="data.type"
      :name="name"
      @close="close"
    />
    <release-modal
      v-if="open === 'release'"
      :id="data.resource.id"
      :type="data.type"
      :name="name"
      @close="close"
    />
    <report-modal
      v-if="open === 'report'"
      :id="data.resource.id"
      :type="data.type"
      :name="name"
      @close="close"
    />
    <!-- "id", "type", and "name" props are only used for compatibility with the other modals -->
    <confirm-modal
      v-if="open === 'confirm'"
      :id="data.resource.id"
      :type="data.type"
      :name="name"
      :modalData="data.modalData"
      @close="close"
    />
    <delete-user-modal v-if="open === 'delete'" :userdata="data.userdata" @close="close" />
  </div>
</template>

<script>
import ConfirmModal from '~/components/Modal/ConfirmModal'
import DisableModal from '~/components/Modal/DisableModal'
import ReleaseModal from '~/components/ReleaseModal/ReleaseModal.vue'
import ReportModal from '~/components/Modal/ReportModal'
import DeleteUserModal from '~/components/Modal/DeleteUserModal.vue'
import { mapGetters } from 'vuex'

export default {
  name: 'Modal',
  components: {
    DisableModal,
    ReleaseModal,
    ReportModal,
    ConfirmModal,
    DeleteUserModal,
  },
  computed: {
    ...mapGetters({
      data: 'modal/data',
      open: 'modal/open',
    }),
    name() {
      // REFACTORING: This gets unneccesary if we use "modalData" in all modals by probaply replacing them all by "confirm-modal"
      if (!this.data || !this.data.resource) return ''
      const {
        resource: { name, title, author },
      } = this.data
      switch (this.data.type) {
        case 'user':
          return name
        case 'contribution': // REFACTORING: In ConfirmModal – Already replaced  "title" by "this.menuModalsData.delete.messageParams".
          return title
        case 'comment':
          return author && author.name
        default:
          return null
      }
    },
  },
  methods: {
    close() {
      this.$store.commit('modal/SET_OPEN', {})
    },
  },
}
</script>
