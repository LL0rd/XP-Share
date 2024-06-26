<template>
  <ds-text class="date-time-range" align="left" color="soft" :size="size">
    <div>
      <div>
        <base-icon name="calendar" data-test="calendar" />
        {{ getStartDateString }}
      </div>
      <div>
        <base-icon name="clock" data-test="calendar" />
        {{
          getStartTimeString +
          (this.endDateAsDate && isSameDayLocal ? '&mdash;' + getEndTimeString : '')
        }}
      </div>
    </div>
    <template v-if="!isSameDayLocal">
      &nbsp;&mdash;&nbsp;
      <div>
        <div>
          <base-icon name="calendar" data-test="calendar" />
          {{ getEndDateString }}
        </div>
        <div>
          <base-icon name="clock" data-test="calendar" />
          {{ getEndTimeString }}
        </div>
      </div>
    </template>
  </ds-text>
</template>

<script>
import { format, isSameDay, isSameYear } from 'date-fns'

export default {
  name: 'DateTimeRange',
  props: {
    /**
     * The size used for the text.
     * @options small|base|large|x-large|xx-large|xxx-large
     */
    size: {
      type: String,
      default: null,
      validator: (value) => {
        return value.match(/(small|base|large|x-large|xx-large|xxx-large)/)
      },
    },
    startDate: {
      type: String,
      require: true,
    },
    endDate: {
      type: String,
      default: null,
    },
  },
  computed: {
    startDateAsDate() {
      return new Date(this.startDate)
    },
    endDateAsDate() {
      return this.endDate ? new Date(this.endDate) : null
    },
    isSameDayLocal() {
      return !this.endDateAsDate || isSameDay(this.endDateAsDate, this.startDateAsDate)
    },
    isSameYearLocal() {
      return !this.endDateAsDate || isSameYear(this.endDateAsDate, this.startDateAsDate)
    },
    getStartDateString() {
      let startDateFormat = this.$t('components.dateTimeRange.yearMonthDay')
      if (!this.isSameDayLocal && this.isSameYearLocal) {
        startDateFormat = this.$t('components.dateTimeRange.monthDay')
      }
      return format(this.startDateAsDate, startDateFormat)
    },
    getStartTimeString() {
      return format(new Date(this.startDate), this.$t('components.dateTimeRange.hourMinute'))
    },
    getEndDateString() {
      return this.endDate
        ? format(new Date(this.endDate), this.$t('components.dateTimeRange.yearMonthDay'))
        : ''
    },
    getEndTimeString() {
      return this.endDate
        ? format(new Date(this.endDate), this.$t('components.dateTimeRange.hourMinute'))
        : ''
    },
  },
}
</script>

<style lang="scss">
.date-time-range {
  display: flex;
  align-items: center;
  gap: 2px;
}
</style>
