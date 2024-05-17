<template>
  <transition name="fade" appear>
    <div>
      <ds-space margin="small">
        <ds-heading tag="h1">{{ heading }}</ds-heading>
        <ds-heading v-if="post && post.group" tag="h2">
          {{ $t('post.viewPost.forGroup.title', { name: post.group.name }) }}
        </ds-heading>
      </ds-space>
      <ds-space margin="large" />
      <ds-flex gutter="small">
        <ds-flex-item :width="{ base: '100%', sm: 2, md: 2, lg: 1 }">
          <base-card
            v-if="post && ready"
            :lang="post.language"
            :class="{
              'post-page': true,
              'disabled-content': post.disabled,
              '--blur-image': blurred,
            }"
            :style="heroImageStyle"
          >
            <template #heroImage v-if="post.image">
              <img :src="post.image | proxyApiUrl" class="image" />
              <aside v-show="post.image && post.image.sensitive" class="blur-toggle">
                <img v-show="blurred" :src="post.image | proxyApiUrl" class="preview" />
                <base-button
                  :icon="blurred ? 'eye' : 'eye-slash'"
                  filled
                  circle
                  @click="blurred = !blurred"
                />
              </aside>
            </template>
            <section class="menu">
              <user-teaser :user="post.isAno ? null : post.author" :group="post.group" wide :date-time="post.createdAt">
                <template #dateTime>
                  <ds-text v-if="post.createdAt !== post.updatedAt">
                    ({{ $t('post.edited') }})
                  </ds-text>
                </template>
              </user-teaser>
              <client-only>
                <content-menu
                  v-if="isAuthenticated"
                  placement="bottom-end"
                  resource-type="contribution"
                  :resource="post"
                  :modalsData="menuModalsData"
                  :is-owner="isAuthor"
                  @pinPost="pinPost"
                  @unpinPost="unpinPost"
                />
              </client-only>
            </section>
            <ds-space margin-bottom="small" />
            <h2 class="title hyphenate-text">{{ post.title }}<br>{{ post.subtitle }}</h2>
            <!-- event data -->
            <ds-space
              v-if="post && post.postType[0] === 'Event'"
              margin-bottom="small"
              style="padding: 10px"
            >
              <location-teaser
                class="event-info"
                :venue="post.eventVenue"
                :locationName="post.eventLocationName"
                :isOnline="post.eventIsOnline"
              />
              <date-time-range
                class="event-info"
                :startDate="post.eventStart"
                :endDate="post.eventEnd"
              />
            </ds-space>
            <ds-space margin-bottom="small" />
            <div v-if="fetchingSimilarPosts" class="loader">
              <loading-spinner />
              <p>Searching for similar posts...</p>
            </div>
            <ds-space margin-bottom="small" />
            <!-- content -->
            <content-viewer class="content hyphenate-text" :content="post.content" />
            <div v-if="post && post.audio && isAuthenticated">
              <audio :src="post.audio.url" controls />
            </div>
            <div v-if="post && post.drawing && isAuthenticated" class="post-drawing">
              <img :src="post.drawing.url" class="post-drawing__image"/>
            </div>
            <div v-if="post && post.files && post.files.length && isAuthenticated" class="files-uploader">
              <div class="files-uploader__files">
                <a target="_blank" :href="file.url" v-for="(file, index) in post.files">
                  <base-button class="files-uploader__files__item">
                    <p><base-icon name="paperclip" /> <span class="files-uploader__files__item__text">{{ file.name }}</span></p>
                    <base-icon name="download" />
                  </base-button>
                </a>
              </div>
            </div>
            <!-- categories -->
            <div v-if="categoriesActive" class="categories">
              <ds-space margin="xx-large" />
              <ds-space margin="xx-small" />
              <hc-category
                v-for="category in sortCategories(post.categories)"
                :key="category.id"
                :icon="category.icon"
                :name="$t(`contribution.category.name.${category.slug}`)"
                v-tooltip="{
                  content: $t(`contribution.category.description.${category.slug}`),
                  placement: 'bottom-start',
                }"
              />
            </div>
            <ds-space margin-bottom="small" />
            <!-- Tags -->
            <div v-if="post.tags && post.tags.length" class="tags">
              <ds-space margin="xx-small" />
              <hc-hashtag v-for="tag in sortedTags" :key="tag.id" :id="tag.id" />
            </div>
            <ds-space margin-top="small">
              <ds-flex :gutter="{ lg: 'small' }">
                <!-- Shout Button -->
                <ds-flex-item
                  :width="{ lg: '15%', md: '22%', sm: '22%', base: '100%' }"
                  class="shout-button"
                >
                  <hc-shout-button
                    v-if="post.author"
                    :disabled="isAuthor || !isAuthenticated "
                    :count="post.shoutedCount"
                    :is-shouted="post.shoutedByCurrentUser"
                    :post-id="post.id"
                  />
                </ds-flex-item>
              </ds-flex>
            </ds-space>
            <ds-space v-if="!fetchingSimilarPosts" margin-top="small">
              <h2 class="similar-posts__title">{{ $t('relatedPosts') }}</h2>
              <div v-if="similarPosts.length" class="similar-posts">
                <nuxt-link :to="`/post/${post.id}`" v-for="(post, index) in similarPosts" :key="`post-${index}`" class="similar-posts__card">
                  <h4 class="similar-posts__card__title">{{ post | translatedTitle(currentLocale) }}</h4>
                  <p class="similar-posts__card__summary">{{ post | translatedSummary(currentLocale) }}</p>
                  <div v-if="post.hashtags && post.hashtags.length" class="similar-posts__card__hashtags">
                    <div v-for="(hash, index) in post.hashtags" :key="`hash-${index}`" class="similar-posts__card__hashtags-item">
                      #{{ hash }}
                    </div>
                  </div>
                </nuxt-link>
              </div>
              <p v-else>{{ $t('noSimilarPostings') }}</p>
            </ds-space>
            <!-- Comments -->
            <ds-section>
              <comment-list
                v-if="isAuthenticated"
                :post="post"
                @toggleNewCommentForm="toggleNewCommentForm"
                @reply="reply"
              />
              <ds-space margin-bottom="large" />
              <comment-form
                v-if="showNewCommentForm && !isBlocked && canCommentPost && isAuthenticated"
                ref="commentForm"
                :post="post"
                @createComment="createComment"
              />
              <ds-placeholder v-if="isBlocked">
                {{ $t('settings.blocked-users.explanation.commenting-disabled') }}
                <br />
                {{ $t('settings.blocked-users.explanation.commenting-explanation') }}
                <page-params-link :pageParams="links.FAQ">
                  {{ $t('site.faq') }}
                </page-params-link>
              </ds-placeholder>
              <ds-placeholder v-if="!isAuthenticated">
                  <nuxt-link to="/login">{{ $t('auth.login') }}</nuxt-link> / <nuxt-link to="/registration">{{ $t('auth.register') }}</nuxt-link> {{ $t('auth.toComment') }}
              </ds-placeholder>
            </ds-section>
          </base-card>
        </ds-flex-item>
        <ds-flex-item :width="{ base: '200px' }">
          <ds-menu :routes="routes" class="post-side-navigation" />
        </ds-flex-item>
      </ds-flex>
    </div>
  </transition>
</template>

<script>
import LoadingSpinner from '~/components/_new/generic/LoadingSpinner/LoadingSpinner'
import ContentViewer from '~/components/Editor/ContentViewer'
import HcCategory from '~/components/Category'
import HcHashtag from '~/components/Hashtag/Hashtag'
import CommentForm from '~/components/CommentForm/CommentForm'
import CommentList from '~/components/CommentList/CommentList'
import ContentMenu from '~/components/ContentMenu/ContentMenu'
import DateTimeRange from '~/components/DateTimeRange/DateTimeRange'
import UserTeaser from '~/components/UserTeaser/UserTeaser'
import HcShoutButton from '~/components/ShoutButton.vue'
import LocationTeaser from '~/components/LocationTeaser/LocationTeaser'
import PageParamsLink from '~/components/_new/features/PageParamsLink/PageParamsLink.vue'
import {
  postMenuModalsData,
  deletePostMutation,
  softDeletePostMutation,
  sortTagsAlphabetically,
} from '~/components/utils/PostHelpers'
import PostQuery from '~/graphql/PostQuery'
import { groupQuery } from '~/graphql/groups'
import PostMutations from '~/graphql/PostMutations'
import links from '~/constants/links.js'
import SortCategories from '~/mixins/sortCategoriesMixin.js'
import { mapGetters } from 'vuex'

export default {
  name: 'PostSlug',
  ssr: true,
  transition: {
    name: 'slide-up',
    mode: 'out-in',
  },
  components: {
    ContentMenu,
    CommentForm,
    CommentList,
    ContentViewer,
    DateTimeRange,
    HcCategory,
    HcHashtag,
    HcShoutButton,
    LocationTeaser,
    PageParamsLink,
    UserTeaser,
    LoadingSpinner
  },
  mixins: [SortCategories],
  head() {
    let dynamicUrl = '';
    if (process.server && this.$nuxt.context.req) {
      dynamicUrl = 'https://' + this.$nuxt.context.req.headers.host + this.$route.path;
    } else if (process.client) {
      dynamicUrl = window.location.href;
    }
    return {
      title: this.title,
      meta: [
        {
          hid: 'og:title',
          name: 'og:title',
          property: 'og:title',
          content: this.title
        },
        {
          hid: 'og:url',
          name: 'og:url',
          property: 'og:url',
          content: dynamicUrl
        },
        {
          hid: 'og:description',
          name: 'og:description',
          property: 'og:description',
          content: this.post && this.post.content.split(/(?<=[.?!])\s+/).slice(0, 3).join(' ').replace(/<\/?(br|p|h[1-6]|a|abbr|acronym|address|area|article|aside|audio|b|base|bdi|bdo|blockquote|body|button|canvas|caption|cite|code|col|colgroup|data|datalist|dd|del|details|dfn|dialog|div|dl|dt|em|embed|fieldset|figcaption|figure|footer|form|head|header|hgroup|hr|html|i|iframe|img|input|ins|kbd|keygen|label|legend|li|link|main|map|mark|menu|menuitem|meta|meter|nav|noscript|object|ol|optgroup|option|output|param|picture|pre|progress|q|rp|rt|ruby|s|samp|script|section|select|small|source|span|strong|style|sub|summary|sup|table|tbody|td|template|textarea|tfoot|th|thead|time|title|tr|track|u|ul|var|video|wbr)\b[^>]*>?/gi, '')
        },
        {
          hid: 'description',
          name: 'description',
          content: this.post && this.post.content.split(/(?<=[.?!])\s+/).slice(0, 3).join(' ').replace(/<\/?(br|p|h[1-6]|a|abbr|acronym|address|area|article|aside|audio|b|base|bdi|bdo|blockquote|body|button|canvas|caption|cite|code|col|colgroup|data|datalist|dd|del|details|dfn|dialog|div|dl|dt|em|embed|fieldset|figcaption|figure|footer|form|head|header|hgroup|hr|html|i|iframe|img|input|ins|kbd|keygen|label|legend|li|link|main|map|mark|menu|menuitem|meta|meter|nav|noscript|object|ol|optgroup|option|output|param|picture|pre|progress|q|rp|rt|ruby|s|samp|script|section|select|small|source|span|strong|style|sub|summary|sup|table|tbody|td|template|textarea|tfoot|th|thead|time|title|tr|track|u|ul|var|video|wbr)\b[^>]*>?/gi, '')
        },
        {
          hid: 'og:image',
          name: 'og:image',
          property: 'og:image',
          content: this.post && this.post.image && this.$options.filters.proxyApiUrl(this.post.image)
        },
        {
          hid: 'description',
          name: 'description',
          content: this.post && this.post.content.split(/(?<=[.?!])\s+/).slice(0, 3).join(' ').replace(/<\/?(br|p|h[1-6]|a|abbr|acronym|address|area|article|aside|audio|b|base|bdi|bdo|blockquote|body|button|canvas|caption|cite|code|col|colgroup|data|datalist|dd|del|details|dfn|dialog|div|dl|dt|em|embed|fieldset|figcaption|figure|footer|form|head|header|hgroup|hr|html|i|iframe|img|input|ins|kbd|keygen|label|legend|li|link|main|map|mark|menu|menuitem|meta|meter|nav|noscript|object|ol|optgroup|option|output|param|picture|pre|progress|q|rp|rt|ruby|s|samp|script|section|select|small|source|span|strong|style|sub|summary|sup|table|tbody|td|template|textarea|tfoot|th|thead|time|title|tr|track|u|ul|var|video|wbr)\b[^>]*>?/gi, '')
        },
      ]
    }
  },
  data() {
    return {
      links,
      post: null,
      ready: false,
      title: 'loading',
      showNewCommentForm: true,
      blurred: false,
      blocked: null,
      postAuthor: null,
      categoriesActive: this.$env.CATEGORIES_ACTIVE,
      group: null,
      fetchingSimilarPosts: false,
      currentLocale: this.$i18n.locale(),
      similarPosts: []
    }
  },
  async created() {
    await this.fetchSimilarPosts(this.$route.params.id);
  },
  async mounted() {
    setTimeout(() => {
      // NOTE: quick fix for jumping flexbox implementation
      // will be fixed in a future update of the styleguide
      this.ready = true
    }, 50)
  },
  computed: {
    ...mapGetters({
      isAuthenticated: 'auth/isAuthenticated',
    }),
    routes() {
      const { slug, id } = this.$route.params
      return [
        {
          name:
            this.post?.postType[0] === 'Event'
              ? this.$t('post.viewEvent.title')
              : this.$t('post.viewPost.title'),
          path: `/post/${id}/${slug}`,
          children: [
            {
              name: this.$t('common.comment', null, 2),
              path: `/post/${id}/${slug}#comments`,
            },
            // TODO implement
            /* {
                name: this.$t('common.letsTalk'),
                path: `/post/${id}/${slug}#lets-talk`
                }, */
            // TODO implement
            /* {
                name: this.$t('common.versus'),
                path: `/post/${id}/${slug}#versus`
                } */
          ],
        },
      ]
    },
    heading() {
      if (this.post?.postType[0] === 'Event') return this.$t('post.viewEvent.title')
      return this.$t('post.viewPost.title')
    },
    menuModalsData() {
      return postMenuModalsData(
        // "this.post" may not always be defined at the beginning …
        this.post ? this.$filters.truncate(this.post.title, 30) : '',
        this.deletePostCallback,
        this.softDeletePostCallback
      )
    },
    isBlocked() {
      const { author } = this.post
      if (!author) return false
      return author.blocked
    },
    isAuthor() {
      const { author } = this.post
      if (!author) return false
      return this.$store.getters['auth/user'].id === author.id
    },
    sortedTags() {
      return sortTagsAlphabetically(this.post.tags)
    },
    heroImageStyle() {
      /*  Return false when image property is not present or is not a number
          so no unnecessary css variables are set.
        */

      if (!this.post.image || typeof this.post.image.aspectRatio !== 'number') return false
      /*  Return the aspect ratio as a css variable. Later to be used when calculating
          the height with respect to the width.
        */
      return {
        '--hero-image-aspect-ratio': 1.0 / this.post.image.aspectRatio,
      }
    },
    canCommentPost() {
      return (
        !this.post.group || (this.group && ['usual', 'admin', 'owner'].includes(this.group.myRole))
      )
    },
  },
  filters: {
    translatedTitle: (post, currentLocale) => {
      return post[`${currentLocale}_title`];
    },
    translatedSummary: (post, currentLocale) => {
      return post[`${currentLocale}_summary`];
    },
  },
  methods: {
    async fetchSimilarPosts(id) {
      this.fetchingSimilarPosts = true;

      const timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout exceeded'));
        }, 30000); // maximum timeout of 30 seconds. This accounts for potential delays due to the API's internal processing involving OpenAI and vector database calls.
      });

      try {
        console.log(`${this.$env.API_URL}/chat-gpt-ai/getSimilarDreams/${id}`)
        const response = await Promise.race([
          fetch(`${this.$env.API_URL}/chat-gpt-ai/getSimilarDreams/${id}`),
          timeoutPromise
        ]);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        this.similarPosts = await response.json()
        this.similarPosts = this.similarPosts.sort((a, b) => b.score - a.score); // Sort according to score
      } catch (e) {
        console.error(e);
      } finally {
        this.fetchingSimilarPosts = false;
      }
    },
    reply(message) {
      this.$refs.commentForm && this.$refs.commentForm.reply(message)
    },
    async deletePostCallback() {
      try {
        await this.$apollo.mutate(deletePostMutation(this.post.id))
        this.$toast.success(this.$t('delete.contribution.success'))
        this.$router.history.push('/') // Redirect to index (main) page
      } catch (err) {
        this.$toast.error(err.message)
      }
    },
    async softDeletePostCallback() {
      try {
        await this.$apollo.mutate(softDeletePostMutation(this.post.id))
        this.$toast.success(this.$t('delete.contribution.admin.success'))
        this.$router.history.push('/') // Redirect to index (main) page
      } catch (err) {
        this.$toast.error(err.message)
      }
    },
    async createComment(comment) {
      this.post.comments.push(comment)
    },
    pinPost(post) {
      this.$apollo
        .mutate({
          mutation: PostMutations().pinPost,
          variables: { id: post.id },
        })
        .then(() => {
          this.$toast.success(this.$t('post.menu.pinnedSuccessfully'))
        })
        .catch((error) => this.$toast.error(error.message))
    },
    unpinPost(post) {
      this.$apollo
        .mutate({
          mutation: PostMutations().unpinPost,
          variables: { id: post.id },
        })
        .then(() => {
          this.$toast.success(this.$t('post.menu.unpinnedSuccessfully'))
        })
        .catch((error) => this.$toast.error(error.message))
    },
    toggleNewCommentForm(showNewCommentForm) {
      this.showNewCommentForm = showNewCommentForm
    },
  },
  apollo: {
    Post: {
      query() {
        return PostQuery(this.$i18n)
      },
      variables() {
        return {
          id: this.$route.params.id,
        }
      },
      update({ Post }) {
        this.post = Post[0] || {}
        this.title = this.post.title
        const { image } = this.post
        this.postAuthor = this.post.author
        this.blurred = image && image.sensitive
      },
      fetchPolicy: 'cache-and-network',
    },
    Group: {
      query() {
        return groupQuery(this.$i18n)
      },
      variables() {
        return {
          id: this.post && this.post.group ? this.post.group.id : null,
        }
      },
      update({ Group }) {
        this.group = Group[0]
      },
      skip() {
        return !(this.post && this.post.group)
      },
    },
  },
}
</script>

<style lang="scss">
.post-side-navigation {
  position: sticky;
  top: 65px;
  z-index: 2;
}
.post-page {
  > .hero-image {
    position: relative;
    /*  The padding top makes sure the correct height is set (according to the
        hero image aspect ratio) before the hero image loads so
        the autoscroll works correctly when following a comment link.
      */

    padding-top: calc(var(--hero-image-aspect-ratio) * (100% + 48px));
    /*  Letting the image fill the container, since the container
        is the one determining height
      */
    > .image {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
    }
  }

  > .menu {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &.--blur-image > .hero-image > .image {
    filter: blur($blur-radius);
  }

  & .event-info {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .blur-toggle {
    position: absolute;
    bottom: 0;
    right: 0;

    display: flex;
    align-items: center;

    height: 80px;
    padding: 12px;

    .preview {
      height: 100%;
      margin-right: 12px;
    }
  }

  .comments {
    margin-top: $space-small;

    .ProseMirror {
      min-height: 0px;
    }
  }
}

@media only screen and (max-width: 960px) {
  .shout-button {
    float: left;
  }
}

.files-uploader {
  grid-column: 1 / -1; /* Span all columns */
  align-self: auto;
  margin-top: 60px;

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

.post-drawing {
  width: 100%;
  height: auto;

  &__image {
    width: 100%;
  }
}

.loader {
  display: flex;
  align-items: center;

  & p {
    margin-left: 12px;
  }
}

.similar-posts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  grid-gap: 10px;
  margin-bottom: 60px;
  margin-top: 16px;

  &__title {
    margin-bottom: 12px;
  }

  &__card {
    border: 1px solid #efeef1;
    border-radius: 6px;
    padding: 20px;
    color: #4b4554 !important;

    &:hover {
      cursor: pointer;
      background: #faf9fa;
    }

    &__title {
      margin-bottom: 16px;
    }

    &__hashtags {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 16px;

      &-item {
        padding: 2px 4px;
        margin-right: 8px;
        font-size: 12px;
        margin-top: 8px;
        border-radius: 6px;
        border: 1px solid #526f98;
        background: #fff;
      }
    }
  }

}
</style>
