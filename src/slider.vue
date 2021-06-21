<template>
  <div
    :style="{ width: width, height: height }"
    class="slider"
    @mouseenter="handleMouseenter"
    @mouseleave="handleMouseleave"
  >
    <slot v-if="!sliderItems.length" name="loading">
      <div class="slider-loading">
        <div class="ball-pulse">
          <div />
          <div />
          <div />
        </div>
      </div>
    </slot>
    <div ref="touchAreaRef" class="slider-items">
      <slot />
    </div>
    <div
      v-if="indicators"
      :class="`slider-indicators slider-indicators-${indicators}`"
      @click.stop
    >
      <span
        v-for="i in sliderItems.length"
        :key="i"
        :class="{ 'slider-indicator-active': currentIndex === i - 1 }"
        class="slider-indicator-icon"
        @click="handleIndicator(i - currentIndex - 1)"
      />
    </div>
    <template v-if="controlBtn">
      <button
        type="button"
        class="slider-btn slider-btn-left"
        :aria-label="prevBtnLabel"
        @click.stop="prev"
      >
        <i class="slider-icon slider-icon-left" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="slider-btn slider-btn-right"
        :aria-label="nextBtnLabel"
        @click.stop="next"
      >
        <i class="slider-icon slider-icon-right" aria-hidden="true" />
      </button>
    </template>
  </div>
</template>

<script>
import { throttle, debounce } from './utils'
import AlloyFinger from './alloyfinger'
import {
  onActivated,
  computed,
  ref,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  reactive,
  watch,
  provide,
} from 'vue'

export default {
  name: 'Slider',
  model: {
    prop: 'value',
    event: 'change',
  },
  props: {
    value: {
      type: Number,
      default: 0,
    },
    width: {
      type: String,
      default: 'auto',
    },
    height: {
      type: String,
      default: '300px',
    },
    touch: {
      type: Boolean,
      default: true,
    },
    animation: {
      type: String,
      default: 'normal',
    },
    autoplay: {
      type: Boolean,
      default: true,
    },
    stopOnHover: {
      type: Boolean,
      default: false,
    },
    interval: {
      type: Number,
      default: 3000,
    },
    speed: {
      type: Number,
      default: 500,
    },
    indicators: {
      type: [String, Boolean],
      default: 'center',
    },
    controlBtn: {
      type: Boolean,
      default: true,
    },
    beforePrevious: {
      type: Function,
      default: () => true,
    },
    beforeNext: {
      type: Function,
      default: () => true,
    },
    prevBtnLabel: {
      type: String,
      default: 'Previous slide',
    },
    nextBtnLabel: {
      type: String,
      default: 'Next slide',
    },
  },
  emits: ['change', 'next', 'previous'],
  setup(props, { emit }) {
    const touchAreaRef = ref(null)
    const state = reactive({
      sliderItems: [],
      currentIndex: 0,
      timer: 0,
      af: null,
      isStopped: false,
    })

    function init() {
      if (state.sliderItems[props.value]) {
        state.currentIndex = props.value
      }

      const currentItem = state.sliderItems[state.currentIndex]

      if (!currentItem) return
      currentItem.init()
      auto()
    }

    const throttledInit = throttle(init, 100)

    const api = {
      register(item) {
        state.sliderItems.push(item)
        throttledInit()
      },
      deregister(item) {
        state.sliderItems = state.sliderItems.filter((si) => si !== item)
        throttledInit()
      },
      speed: computed(() => props.speed),
      animation: computed(() => props.animation),
    }

    provide('slider-api', api)

    function initTouchArea(touchArea) {
      if (state.af || !props.touch || !touchArea) return

      state.af = new AlloyFinger(touchArea, {
        swipe: (e) => {
          e.direction === 'Left' ? next() : prev()
        },
      })
    }

    const canMove = computed(() => {
      return state.sliderItems.length > 1
    })

    function _move(step) {
      if (!step || !canMove.value) return

      // direction:
      //    > 0 = left
      //    < 0 = right
      const direction = step > 0
      const nextIndex = getNextIndex(step)
      const currentItem = state.sliderItems[state.currentIndex]
      const nextItem = state.sliderItems[nextIndex]

      currentItem.hide(direction)
      nextItem.show(direction)
      state.currentIndex = nextIndex
      emit('change', nextIndex)
    }

    const move = debounce(_move, props.speed - 200)

    function auto() {
      if (!props.autoplay || state.isStopped) return

      if (state.timer) clearInterval(state.timer)
      state.timer = setInterval(() => {
        move(1)
      }, props.interval)
    }

    function prev() {
      if (!props.beforePrevious()) return

      handleControlBtn('previous')
    }
    function next() {
      if (!props.beforeNext()) return

      handleControlBtn('next')
    }

    function handleIndicator(step) {
      if (!step || !canMove.value) return

      move(step)
      auto()
    }

    function getNextIndex(step) {
      const slidersLen = state.sliderItems.length
      if (!state.sliderItems[state.currentIndex]) {
        state.currentIndex = slidersLen - 1
      }
      return (state.currentIndex + step + slidersLen) % slidersLen
    }

    function handleControlBtn(direction) {
      if (!canMove.value) return

      const step = direction === 'next' ? 1 : -1
      const nextIndex = getNextIndex(step)

      emit(direction, {
        original: state.currentIndex,
        next: nextIndex,
      })
      move(step)
      auto()
    }

    function handleMouseenter() {
      if (props.autoplay && props.stopOnHover) {
        state.isStopped = true
        if (state.timer) clearInterval(state.timer)
      }
    }

    function handleMouseleave() {
      if (props.autoplay && props.stopOnHover) {
        state.isStopped = false
        auto()
      }
    }

    const updateIndicator = debounce((value) => {
      const step = value - state.currentIndex

      if (!step || value < 0 || value > state.sliderItems.length - 1) return

      handleIndicator(step)
    }, 100)

    watch(() => props.value, updateIndicator)

    watch(
      () => touchAreaRef.value,
      (touchArea) => {
        initTouchArea(touchArea)
      },
      {
        immediate: true,
      }
    )

    // onBeforeMount(() => {
    //   this.init = throttle(this.init, 100)
    //   this.move = debounce(this.move, this.speed - 200)
    // })
    onMounted(() => {
      init()
    })

    // init when keep-alive
    onActivated(() => {
      init()
    })

    onBeforeUnmount(() => {
      state.timer && clearInterval(state.timer)
      state.af && state.af.destroy()
    })

    onDeactivated(() => {
      state.timer && clearInterval(state.timer)
      state.af && state.af.destroy()
      state.af = null
    })

    return {
      touchAreaRef,
      handleMouseenter,
      handleMouseleave,
      sliderItems: computed(() => state.sliderItems),
      currentIndex: computed(() => state.currentIndex),
      handleIndicator,
      prev,
      next,
    }
  },
}
</script>

<style lang="scss" scoped>
.slider {
  position: relative;
  overflow: hidden;
  &-items {
    width: 100%;
    height: 100%;
  }

  &-btn {
    position: absolute;
    top: 0;
    z-index: 999;

    height: 100%;
    width: 50px;
    border: none;

    background: rgba(0, 0, 0, 0.1);
    outline: none;
    transition: background 0.3s;
    cursor: pointer;

    &:hover .slider-icon {
      border-color: rgba(255, 255, 255, 1);
    }
  }
  &-btn-left {
    left: 0;
    background: linear-gradient(90deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0));
  }
  &-btn-right {
    right: 0;
    background: linear-gradient(-90deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0));
  }
  &-icon {
    display: inline-block;
    width: 15px;
    height: 15px;
    border-left: 2px solid rgba(255, 255, 255, 0.6);
    border-bottom: 2px solid rgba(255, 255, 255, 0.6);
    transition: border 0.2s;
  }

  &-icon-left {
    transform: rotate(45deg);
  }
  &-icon-right {
    transform: rotate(-135deg);
  }
  &-indicators {
    position: absolute;
    bottom: 20px;
    z-index: 999;

    &-center {
      left: 50%;
      transform: translateX(-50%);
    }
    &-left {
      left: 6%;
    }

    &-right {
      right: 6%;
    }
  }
  &-indicator-icon {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin: 0 0.1rem;

    cursor: pointer;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.2);
  }
  &-indicator-active {
    background-color: rgba(255, 255, 255, 0.2);
  }

  &-loading {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 99;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: center;
    align-items: center;
  }
}
.ball-pulse {
  & > div:nth-child(1) {
    animation: scale 0.75s -0.24s infinite cubic-bezier(0.2, 0.68, 0.18, 1.08);
  }
  & > div:nth-child(2) {
    animation: scale 0.75s -0.12s infinite cubic-bezier(0.2, 0.68, 0.18, 1.08);
  }
  & > div:nth-child(3) {
    animation: scale 0.75s 0s infinite cubic-bezier(0.2, 0.68, 0.18, 1.08);
  }
  & > div {
    background-color: #fff;
    width: 15px;
    height: 15px;
    border-radius: 100%;
    margin: 2px;
    animation-fill-mode: both;
    display: inline-block;
  }
}
@keyframes scale {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  45% {
    transform: scale(0.1);
    opacity: 0.7;
  }
  80% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
