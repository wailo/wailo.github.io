<template>
  <div class="btn btn-default" @click="handleClick">
    <svg viewBox="0 0 50 5" :style="svgStyle">
      <line
        stroke-dasharray="0.1 0.1"
        x1="40%"
        y1="20%"
        x2="60%"
        y2="20%"
        stroke-width="1"
        :stroke="isPressed ? '#00ff00' : 'goldenrod'"
      />
      <rect x="0" y="0" fill="none" width="50" height="5" />
      <text
        fill="white"
        class="label-default"
        x="50%"
        y="70%"
        text-anchor="middle"
        dominant-baseline="middle"
        style="font-size: 20%"
      >
        {{ label }}
      </text>
    </svg>
  </div>
  <!-- <p style="text-align: center; font-size: 10px">{{ label }}</p> -->
  <!-- </div> -->
</template>

<script>
export default {
  name: 'SvgButton',
  props: {
    width: {
      type: Number,
      default: 100,
    },
    height: {
      type: Number,
      default: 100,
    },
    label: {
      type: String,
      default: 'Button',
    },
    isPressed: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    wrapperStyle() {
      return {
        width: `${this.width}%`,
        height: `${this.$refs.svg.clientHeight}px`, // Set to SVG height
        display: 'flex',
        'flex-direction': 'column',
        border: '1px solid #757575',
      }
    },
    svgStyle() {
      return {
        // width: '100%',
        // height: '100%',
        // 'max-height': '37px',
        // 'max-width': '100px',
        cursor: 'pointer',
      }
    },
  },
  methods: {
    handleClick() {
      this.$emit('click')
    },
  },
}
</script>
<style scoped>
/* * {
  box-sizing: border-box;
} */

.btn {
  width: 100%;
  /* height: 100%; */
  /* display: block; */
  font-size: 10px;
  cursor: pointer;
  /* overflow: hidden; */
}
.btn svg {
  position: relative;
  top: 0;
  left: 0;
}
.btn svg rect {
  stroke: #1d0202;
  stroke-width: 0.2;
  /* stroke-dasharray: 422, 0; */
  /* stroke-dashoffset: 0; */

  @include transition(all 900ms $ease-out-expo);
}
.btn:hover svg rect {
  stroke-width: 0.5;
  /* stroke-dasharray: 110, 312; */
  /* stroke-dashoffset: 183; */
}
</style>
