<template>
  <ds-tag class="category-tag" :class="filterActive ? 'filterActive' : ''">
    <base-icon :name="icon" />
    {{ name }}
  </ds-tag>
</template>

<script>
export default {
  name: 'HcCategory',
  props: {
    icon: { type: String, required: true },
    name: { type: String, default: '' },
    filterActive: { type: Boolean, default: false, required: false },
  },
}
</script>

<style lang="scss">
.category-tag {
  display: inline-flex;
  align-items: center;
  &.language {
    float: right;
  }

  > .base-icon {
    margin-right: $space-xx-small;
    font-size: $font-size-base;
  }
}
.filterActive {
  color: $color-primary-inverse;
  background-color: $color-primary-active;
}
</style>
