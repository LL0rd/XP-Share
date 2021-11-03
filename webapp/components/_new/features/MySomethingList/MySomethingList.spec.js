import { mount } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import MySomethingList from './MySomethingList.vue'
import Vuex from 'vuex'
import Vue from 'vue'

const localVue = global.localVue

describe('MySomethingList.vue', () => {
  let wrapper
  let mocks
  let getters
  const socialMediaUrl = 'https://freeradical.zone/@mattwr18'
  const newSocialMediaUrl = 'https://twitter.com/mattwr18'

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      $apollo: {
        mutate: jest.fn(),
      },
      $toast: {
        error: jest.fn(),
        success: jest.fn(),
      },
    }
    getters = {
      'auth/user': () => {
        return {}
      },
    }
  })

  describe('mount', () => {
    let form, input, slots, submitButton
    const Wrapper = () => {
      const store = new Vuex.Store({
        getters,
      })
      slots = { 'list-item': '<div class="list-item"></div>' }
      return mount(MySomethingList, { store, mocks, localVue, slots })
    }

    describe('adding social media link', () => {
      beforeEach(() => {
        wrapper = Wrapper()
        form = wrapper.find('form')
        input = wrapper.find('input#addSocialMedia')
        submitButton = wrapper.find('button')
      })

      // Wolle it('requires the link to be a valid url', async () => {
      //   input.setValue('some value')
      //   form.trigger('submit')
      //   await Vue.nextTick()
      //   expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
      // })

      it('displays an error message when not saved successfully', async () => {
        mocks.$apollo.mutate.mockRejectedValue({ message: 'Ouch!' })
        input.setValue(newSocialMediaUrl)
        form.trigger('submit')
        await Vue.nextTick()
        await flushPromises()
        expect(mocks.$toast.error).toHaveBeenCalledTimes(1)
      })

      describe('success', () => {
        beforeEach(async () => {
          mocks.$apollo.mutate.mockResolvedValue({
            data: { CreateSocialMedia: { id: 's2', url: newSocialMediaUrl } },
          })
          input.setValue(newSocialMediaUrl)
          form.trigger('submit')
          await Vue.nextTick()
        })

        it('sends the new url to the backend', () => {
          const expected = expect.objectContaining({
            variables: { url: newSocialMediaUrl },
          })

          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(expected)
        })

        it('displays a success message', async () => {
          await flushPromises()
          expect(mocks.$toast.success).toHaveBeenCalledTimes(1)
        })

        it('clears the form', async () => {
          await flushPromises()
          expect(input.value).toBe(undefined)
          expect(submitButton.vm.$attrs.disabled).toBe(true)
        })
      })
    })

    describe('given existing social media links', () => {
      beforeEach(() => {
        getters = {
          'auth/user': () => ({
            socialMedia: [{ id: 's1', url: socialMediaUrl }],
          }),
        }

        wrapper = Wrapper()
        form = wrapper.find('form')
      })

      describe('for each item it', () => {
        it('displays the item as slot "list-item"', () => {
          expect(wrapper.find('.list-item').exists()).toBe(true)
        })

        it('displays the edit button', () => {
          expect(wrapper.find('.base-button[data-test="edit-button"]').exists()).toBe(true)
        })

        it('displays the delete button', () => {
          expect(wrapper.find('.base-button[data-test="delete-button"]').exists()).toBe(true)
        })
      })

      it('does not accept a duplicate url', async () => {
        wrapper.find('input#addSocialMedia').setValue(socialMediaUrl)
        form.trigger('submit')
        await Vue.nextTick()
        expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
      })

      describe('editing social media link', () => {
        beforeEach(async () => {
          const editButton = wrapper.find('.base-button[data-test="edit-button"]')
          editButton.trigger('click')
          await Vue.nextTick()
          input = wrapper.find('input#editSocialMedia')
        })

        it('disables adding new links while editing', () => {
          const addInput = wrapper.find('input#addSocialMedia')

          expect(addInput.exists()).toBe(false)
        })

        // Wolle remove? or test here abstract? it('sends the new url to the backend', async () => {
        //   const expected = expect.objectContaining({
        //     variables: { id: 's1', url: newSocialMediaUrl },
        //   })
        //   input.setValue(newSocialMediaUrl)
        //   form.trigger('submit')
        //   await Vue.nextTick()
        //   expect(mocks.$apollo.mutate).toHaveBeenCalledWith(expected)
        // })

        it('allows the user to cancel editing', async () => {
          const cancelButton = wrapper.find('button#cancel')
          cancelButton.trigger('click')
          await Vue.nextTick()
          expect(wrapper.find('input#editSocialMedia').exists()).toBe(false)
        })
      })

      describe('deleting social media link', () => {
        beforeEach(async () => {
          const deleteButton = wrapper.find('.base-button[data-test="delete-button"]')
          deleteButton.trigger('click')
          await Vue.nextTick()
        })

        it('sends the link id to the backend', () => {
          const expected = expect.objectContaining({
            variables: { id: 's1' },
          })

          expect(mocks.$apollo.mutate).toHaveBeenCalledTimes(1)
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(expected)
        })

        it('displays a success message', async () => {
          await flushPromises()
          expect(mocks.$toast.success).toHaveBeenCalledTimes(1)
        })
      })
    })
  })
})
