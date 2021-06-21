<template>
  <transition
    :name="initAnimation ? '' : `${animation}-${direction ? 'left' : 'right'}`"
  >
    <div
      v-show="display"
      v-bind="$attrs"
      :style="{ zIndex: zIndex, transition: `all ${speed / 1000}s` }"
      class="slider-item"
    >
      <slot />
    </div>
  </transition>
</template>

<script>
import {
  onBeforeMount,
  reactive,
  nextTick,
  onBeforeUnmount,
  computed,
  inject,
} from 'vue'
export default {
  name: 'SliderItem',
  setup() {
    const state = reactive({
      display: false,
      isInited: false,
      initAnimation: false,
      direction: false,
      animation: 'normal',
      speed: 500,
      zIndex: 99,
    })

    const slider = inject('slider-api')

    function init() {
      if (state.isInited) {
        return
      }

      state.isInited = true
      state.display = true
      state.initAnimation = true
      nextTick(() => (state.initAnimation = false))
    }

    function show(direction) {
      state.zIndex = 99
      state.direction = direction
      nextTick(() => (state.display = true))
    }

    function hide(direction) {
      state.zIndex = 98
      state.direction = direction
      nextTick(() => (state.display = false))
    }

    const itemApi = {
      init,
      show,
      hide,
    }

    onBeforeMount(() => {
      slider.register(itemApi)
      state.speed = slider.speed.value || 500
      state.animation = slider.animation.value || 'normal'
    })

    onBeforeUnmount(() => {
      slider.deregister(itemApi)
    })

    return {
      initAnimation: computed(() => state.initAnimation),
      animation: computed(() => state.animation),
      direction: computed(() => state.direction),
      display: computed(() => state.display),
      zIndex: computed(() => state.zIndex),
      speed: computed(() => state.speed),
    }
  },
}
</script>

<style lang="scss" scoped>
.slider-item {
  position: absolute;
  top: 0;
  left: 0;

  width: 100%;
  height: 100%;
}
.normal-right-enter-from,
.normal-left-leave-to {
  transform: translateX(-100%);
}
.normal-left-enter-from,
.normal-right-leave-to {
  transform: translateX(100%);
}
.fade-left-enter-from,
.fade-right-enter-from,
.fade-left-leave-to,
.fade-right-leave-to {
  opacity: 0;
}
.fade-right-enter-from,
.fade-left-leave-to {
  transform: translateX(-10px);
}
.fade-left-enter-from,
.fade-right-leave-to {
  transform: translateX(10px);
}
</style>
