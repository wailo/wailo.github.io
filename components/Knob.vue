<template>
  <div align="centre">
    <input
      ref="knob"
      v-on:input="
        (e) => {
          $emit('input', e.target.value)
        }
      "
      v-on:change="
        (e) => {
          $emit('change', e.target.value)
        }
      "
      :min="min"
      :max="max"
      :step="step"
      class="input-knob"
      type="range"
    />
    <label>{{ label }}</label>
  </div>
</template>
<script>
export default {
  name: 'Knob',
  props: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    initial: { type: Number, default: 50 },
    label: { type: String, default: 'knob' },
    step: { type: Number, default: 1 },
  },
  data() {
    return {
      op: {
        knobWidth: 64,
        knobHeight: 64,
        sliderWidth: 128,
        sliderHeight: 20,
        switchWidth: 24,
        switchHeight: 24,
        fgcolor: '#fff',
        bgcolor: '#000',
        knobMode: 'linear',
        sliderMode: 'relative',
      },
    }
  },
  computed: {
    styles() {
      return {
        '--knobWidth': `${this.op.knobWidth}px`,
        '--knobHeight': `${this.op.knobHeight}px`,
        '--sliderWidth': `${this.opsliderWidth}px`,
        '--sliderHeight': `${this.op.sliderHeight}px`,
        '--switchWidth': `${this.op.switchWidth}px`,
        '--switchHeight': `${this.op.switchHeigh}px`,
      }
    },
  },
  mounted() {
    //     const styles = this.$el.createElement('style')
    //     styles.innerHTML = `input[type=range].input-knob,input[type=range].input-slider{
    //   -webkit-appearance:none;
    //   -moz-appearance:none;
    //   border:none;
    //   box-sizing:border-box;
    //   overflow:hidden;
    //   background-repeat:no-repeat;
    //   background-size:100% 100%;
    //   background-position:0px 0%;
    //   background-color:transparent;
    //   touch-action:none;
    // }
    // input[type=range].input-knob{
    //   width:${this.op.knobWidth}px; height:${this.op.knobHeight}px;
    // }
    // input[type=range].input-slider{
    //   width:${this.op.sliderWidth}px; height:${this.op.sliderHeight}px;
    // }
    // input[type=range].input-knob::-webkit-slider-thumb,input[type=range].input-slider::-webkit-slider-thumb{
    //   -webkit-appearance:none;
    //   opacity:0;
    // }
    // input[type=range].input-knob::-moz-range-thumb,input[type=range].input-slider::-moz-range-thumb{
    //   -moz-appearance:none;
    //   height:0;
    //   border:none;
    // }
    // input[type=range].input-knob::-moz-range-track,input[type=range].input-slider::-moz-range-track{
    //   -moz-appearance:none;
    //   height:0;
    //   border:none;
    // }
    // input[type=checkbox].input-switch,input[type=radio].input-switch {
    //   width:${this.op.switchWidth}px;
    //   height:${this.op.switchHeight}px;
    //   -webkit-appearance:none;
    //   -moz-appearance:none;
    //   background-size:100% 200%;
    //   background-position:0% 0%;
    //   background-repeat:no-repeat;
    //   border:none;
    //   border-radius:0;
    //   background-color:transparent;
    // }
    // input[type=checkbox].input-switch:checked,input[type=radio].input-switch:checked {
    //   background-position:0% 100%;
    // }`
    // this.$el.head.appendChild(styles)

    this.refreshelem(this.$refs.knob, 'k')
    // this.refreshque()
    // setInterval(() => {
    //   for (let i = 0; procque.length > 0 && i < 8; ++i) {
    //     const q = procque.shift()
    //     q[0](q[1])
    //   }
    //   // eslint-disable-next-line no-console
    //   console.log(procque.length)
    //   if (procque.length <= 0) refreshque()
    // }, 500)
  },
  methods: {
    makeKnobFrames(fr, fg, bg) {
      let r = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="64" height="${
        fr * 64
      }" viewBox="0 0 64 ${fr * 64}" preserveAspectRatio="none">
<defs><g id="K"><circle cx="32" cy="32" r="30" fill="${bg}" fill-opacity="0.0" stroke-width="2" stroke="${fg}"/>
<line x1="32" y1="28" x2="32" y2="7" stroke-linecap="round" stroke-width="6" stroke="${fg}"/></g></defs>
<use xlink:href="#K" transform="rotate(-135,32,32)"/>`
      for (let i = 1; i < fr; ++i)
        r += `<use xlink:href="#K" transform="translate(0,${64 * i}) rotate(${
          -135 + (270 * i) / fr
        },32,32)"/>`
      return r + '</svg>'
    },
    makeHSliderFrames(fr, fg, bg, w, h) {
      let r = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${
        fr * h
      }" viewBox="0 0 ${w} ${fr * h}" preserveAspectRatio="none">
<defs><g id="B"><rect x="0" y="0" width="${w}" height="${h}" rx="${
        h / 2
      }" ry="${h / 2}" fill="${bg}"/></g>
<g id="K"><circle x="${w / 2}" y="0" r="${
        (h / 2) * 0.9
      }" fill="${fg}"/></g></defs>`
      for (let i = 0; i < fr; ++i) {
        r += `<use xlink:href="#B" transform="translate(0,${h * i})"/>`
        r += `<use xlink:href="#K" transform="translate(${
          h / 2 + ((w - h) * i) / 100
        },${h / 2 + h * i})"/>`
      }
      return r + '</svg>'
    },
    makeVSliderFrames(fr, fg, bg, w, h) {
      let r = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${
        fr * h
      }" viewBox="0 0 ${w} ${fr * h}" preserveAspectRatio="none">
<defs><rect id="B" x="0" y="0" width="${w}" height="${h}" rx="${w / 2}" ry="${
        w / 2
      }" fill="${bg}"/>
<circle id="K" x="0" y="0" r="${(w / 2) * 0.9}" fill="${fg}"/></defs>`
      for (let i = 0; i < fr; ++i) {
        r += `<use xlink:href="#B" transform="translate(0,${h * i})"/>`
        r += `<use xlink:href="#K" transform="translate(${w / 2} ${
          h * (i + 1) - w / 2 - (i * (h - w)) / 100
        })"/>`
      }
      return r + '</svg>'
    },
    //     initSwitches(el) {
    //       let w, h, d, fg, bg
    //       if (el.inputKnobs) return
    //       el.inputKnobs = {}
    //       el.refresh = () => {
    //         const src = el.getAttribute('data-src')
    //         d = +el.getAttribute('data-diameter')
    //         const st = document.defaultView.getComputedStyle(el, null)
    //         w = parseFloat(el.getAttribute('data-width') || d || st.width)
    //         h = parseFloat(el.getAttribute('data-height') || d || st.height)
    //         bg = el.getAttribute('data-bgcolor') || this.op.bgcolor
    //         fg = el.getAttribute('data-fgcolor') || this.op.fgcolor
    //         el.style.width = w + 'px'
    //         el.style.height = h + 'px'
    //         if (src) el.style.backgroundImage = 'url(' + src + ')'
    //         else {
    //           const minwh = Math.min(w, h)
    //           const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h *
    //             2}" viewBox="0 0 ${w} ${h * 2}" preserveAspectRatio="none">
    // <g><rect fill="${bg}" x="1" y="1" width="${w - 2}" height="${h -
    //             2}" rx="${minwh * 0.25}" ry="${minwh * 0.25}"/>
    // <rect fill="${bg}" x="1" y="${h + 1}" width="${w - 2}" height="${h -
    //             2}" rx="${minwh * 0.25}" ry="${minwh * 0.25}"/>
    // <circle fill="${fg}" cx="${w * 0.5}" cy="${h * 1.5}" r="${minwh *
    //             0.25}"/></g></svg>`
    //           el.style.backgroundImage =
    //             'url(data:image/svg+xml;base64,' + btoa(svg) + ')'
    //         }
    //       }
    //       el.refresh()
    //     },
    initKnobs(el) {
      let w, h, d, fg, bg
      if (el.inputKnobs) {
        el.redraw()
        return
      }
      const ik = (el.inputKnobs = {})
      el.refresh = () => {
        d = +el.getAttribute('data-diameter')

        w = parseFloat(el.getAttribute('data-width') || d || this.op.knobWidth)
        h = parseFloat(
          el.getAttribute('data-height') || d || this.op.knobHeight
        )
        bg = el.getAttribute('data-bgcolor') || this.op.bgcolor
        fg = el.getAttribute('data-fgcolor') || this.op.fgcolor
        ik.sensex = ik.sensey = 200
        if (el.className.includes('input-knob')) ik.itype = 'k'
        else if (w >= h) {
          ik.itype = 'h'
          ik.sensex = w - h
          ik.sensey = Infinity
          el.style.backgroundSize = 'auto 100%'
        } else {
          ik.itype = 'v'
          ik.sensex = Infinity
          ik.sensey = h - w
          el.style.backgroundSize = '100% auto'
        }
        el.style.width = w + 'px'
        el.style.height = h + 'px'
        ik.frameheight = h
        const src = el.getAttribute('data-src')
        if (src) {
          el.style.backgroundImage = `url(${src})`
          const sp = +el.getAttribute('data-sprites')
          if (sp) ik.sprites = sp
          else ik.sprites = 0
          if (ik.sprites >= 1)
            el.style.backgroundSize = `100% ${(ik.sprites + 1) * 100}%`
          else if (ik.itype !== 'k') {
            el.style.backgroundColor = bg
            el.style.borderRadius = Math.min(w, h) * 0.25 + 'px'
          }
        } else {
          let svg
          switch (ik.itype) {
            case 'k':
              svg = this.makeKnobFrames(101, fg, bg)
              break
            case 'h':
              svg = this.makeHSliderFrames(101, fg, bg, w, h)
              break
            case 'v':
              svg = this.makeVSliderFrames(101, fg, bg, w, h)
              break
          }
          ik.sprites = 100
          el.style.backgroundImage =
            'url(data:image/svg+xml;base64,' + btoa(svg) + ')'
          el.style.backgroundSize = `100% ${(ik.sprites + 1) * 100}%`
        }
        ik.valrange = {
          min: +el.min,
          max: el.max === '' ? 100 : +el.max,
          step: el.step === '' ? 1 : +el.step,
        }
        el.redraw(true)
      }
      el.setValue = (v) => {
        v =
          Math.round((v - ik.valrange.min) / ik.valrange.step) *
            ik.valrange.step +
          ik.valrange.min
        if (v < ik.valrange.min) v = ik.valrange.min
        if (v > ik.valrange.max) v = ik.valrange.max
        el.value = v
        if (el.value !== ik.oldvalue) {
          el.setAttribute('value', el.value)
          el.redraw()
          // const event = this.$el.createEvent('HTMLEvents')
          // event.initEvent('input', false, true)
          // el.dispatchEvent(event)

          const event = new CustomEvent('input', {
            detail: el.value,
            bubbles: true,
          })
          // Dispatch the event.
          el.dispatchEvent(event)

          ik.oldvalue = el.value
          this.refreshelem(el, ik.itype)
        }
      }
      ik.pointerdown = (ev) => {
        el.focus()
        if (ev.touches) ev = ev.touches[0]
        const rc = el.getBoundingClientRect()
        const cx = (rc.left + rc.right) * 0.5
        const cy = (rc.top + rc.bottom) * 0.5
        const dx = ev.clientX
        const dy = ev.clientY
        const da = Math.atan2(ev.clientX - cx, cy - ev.clientY)
        if (ik.itype === 'k' && this.op.knobMode === 'circularabs') {
          const dv =
            ik.valrange.min +
            ((da / Math.PI) * 0.75 + 0.5) * (ik.valrange.max - ik.valrange.min)
          el.setValue(dv)
        }
        if (ik.itype !== 'k' && this.op.sliderMode === 'abs') {
          const dv =
            (ik.valrange.min + ik.valrange.max) * 0.5 +
            ((dx - cx) / ik.sensex - (dy - cy) / ik.sensey) *
              (ik.valrange.max - ik.valrange.min)
          el.setValue(dv)
        }
        ik.dragfrom = {
          x: ev.clientX,
          y: ev.clientY,
          a: Math.atan2(ev.clientX - cx, cy - ev.clientY),
          v: +el.value,
        }
        document.addEventListener('mousemove', ik.pointermove)
        document.addEventListener('mouseup', ik.pointerup)
        document.addEventListener('touchmove', ik.pointermove)
        document.addEventListener('touchend', ik.pointerup)
        document.addEventListener('touchcancel', ik.pointerup)
        document.addEventListener('touchstart', ik.preventScroll)
        ev.preventDefault()
        ev.stopPropagation()
      }
      ik.pointermove = (ev) => {
        const rc = el.getBoundingClientRect()
        const cx = (rc.left + rc.right) * 0.5
        const cy = (rc.top + rc.bottom) * 0.5
        if (ev.touches) ev = ev.touches[0]
        const dx = ev.clientX - ik.dragfrom.x
        const dy = ev.clientY - ik.dragfrom.y
        let da = Math.atan2(ev.clientX - cx, cy - ev.clientY)
        switch (ik.itype) {
          case 'k':
            switch (this.op.knobMode) {
              case 'linear':
                let dv =
                  (dx / ik.sensex - dy / ik.sensey) *
                  (ik.valrange.max - ik.valrange.min)
                if (ev.shiftKey) dv *= 0.2
                el.setValue(ik.dragfrom.v + dv)
                break
              case 'circularabs':
                if (!ev.shiftKey) {
                  const dv =
                    ik.valrange.min +
                    ((da / Math.PI) * 0.75 + 0.5) *
                      (ik.valrange.max - ik.valrange.min)
                  el.setValue(dv)
                }
                break
              case 'circularrel':
                if (da > ik.dragfrom.a + Math.PI) da -= Math.PI * 2
                if (da < ik.dragfrom.a - Math.PI) da += Math.PI * 2
                da -= ik.dragfrom.a
                dv = (da / Math.PI / 1.5) * (ik.valrange.max - ik.valrange.min)
                if (ev.shiftKey) dv *= 0.2
                el.setValue(ik.dragfrom.v + dv)
            }
            break
          case 'h':
          case 'v':
            let dv =
              (dx / ik.sensex - dy / ik.sensey) *
              (ik.valrange.max - ik.valrange.min)
            if (ev.shiftKey) dv *= 0.2
            el.setValue(ik.dragfrom.v + dv)
            break
        }
      }
      ik.pointerup = () => {
        document.removeEventListener('mousemove', ik.pointermove)
        document.removeEventListener('touchmove', ik.pointermove)
        document.removeEventListener('mouseup', ik.pointerup)
        document.removeEventListener('touchend', ik.pointerup)
        document.removeEventListener('touchcancel', ik.pointerup)
        document.removeEventListener('touchstart', ik.preventScroll)
        // const event = this.$el.createEvent('HTMLEvents')
        // event.initEvent('change', false, true)
        // el.dispatchEvent(event)

        const event = new CustomEvent('change', {
          detail: el.value,
          bubbles: true,
        })
        // Dispatch the event.
        el.dispatchEvent(event)
      }
      ik.preventScroll = (ev) => {
        ev.preventDefault()
      }
      ik.keydown = () => {
        el.redraw()
      }
      ik.wheel = (ev) => {
        let delta = ev.deltaY > 0 ? -ik.valrange.step : ik.valrange.step
        if (!ev.shiftKey) delta *= 5
        el.setValue(+el.value + delta)
        ev.preventDefault()
        ev.stopPropagation()
      }
      ik.toggle = (ev) => {
        this.op.fgcolor = this.op.fgcolor === '#F00' ? '#FFF' : '#F00'
        el.refresh()
      }
      el.redraw = (f) => {
        if (f || ik.valueold !== el.value) {
          const v =
            (el.value - ik.valrange.min) / (ik.valrange.max - ik.valrange.min)
          if (ik.sprites >= 1)
            el.style.backgroundPosition =
              '0px ' + -((v * ik.sprites) | 0) * ik.frameheight + 'px'
          else {
            switch (ik.itype) {
              case 'k':
                el.style.transform = 'rotate(' + (270 * v - 135) + 'deg)'
                break
              case 'h':
                el.style.backgroundPosition = (w - h) * v + 'px 0px'
                break
              case 'v':
                el.style.backgroundPosition = '0px ' + (h - w) * (1 - v) + 'px'
                break
            }
          }
          ik.valueold = el.value
        }
      }
      el.refresh()
      el.redraw(true)
      el.addEventListener('keydown', ik.keydown)
      el.addEventListener('mousedown', ik.pointerdown)
      el.addEventListener('touchstart', ik.pointerdown)
      el.addEventListener('wheel', ik.wheel)
      el.addEventListener('click', ik.toggle)
    },
    refreshque() {
      const que = []
      let elem = this.$el.querySelectorAll(
        'input.input-knob,input.input-slider'
      )
      for (let i = 0; i < elem.length; ++i) que.push([this.initKnobs, elem[i]])
      elem = this.$el.querySelectorAll(
        'input[type=checkbox].input-switch,input[type=radio].input-switch'
      )
      for (let i = 0; i < elem.length; ++i) {
        que.push([this.initSwitches, elem[i]])
      }

      for (let i = 0; que.length > 0 && i < 8; ++i) {
        const q = que.shift()
        q[0](q[1])
      }
    },

    refreshelem(elem, type) {
      switch (type) {
        case 'k':
          this.initKnobs(elem)
          break
        case 'h':
        case 'v':
          this.initSwitches(elem)
          break
      }
    },
  },
}
</script>

<style scoped>
input[type='range'].input-knob {
  width: var(--knobWidth);
  height: var(--knobHeight);
}
input[type='range'].input-slider {
  width: var(--sliderWidth);
  height: var(--sliderHeight);
}

input[type='checkbox'].input-switch,
input[type='radio'].input-switch {
  width: var(--switchWidth);
  height: var(--switchHeight);
  -webkit-appearance: none;
  -moz-appearance: none;
  background-size: 100% 200%;
  background-position: 0% 0%;
  background-repeat: no-repeat;
  border: none;
  border-radius: 0;
  background-color: transparent;
}
input[type='range'].input-knob,
input[type='range'].input-slider {
  -webkit-appearance: none;
  -moz-appearance: none;
  border: none;
  box-sizing: border-box;
  overflow: hidden;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  background-position: 0px 0%;
  background-color: transparent;
  touch-action: none;
}
input[type='range'].input-knob::-webkit-slider-thumb,
input[type='range'].input-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  opacity: 0;
}
input[type='range'].input-knob::-moz-range-thumb,
input[type='range'].input-slider::-moz-range-thumb {
  -moz-appearance: none;
  height: 0;
  border: none;
}
input[type='range'].input-knob::-moz-range-track,
input[type='range'].input-slider::-moz-range-track {
  -moz-appearance: none;
  height: 0;
  border: none;
}
input[type='checkbox'].input-switch:checked,
input[type='radio'].input-switch:checked {
  background-position: 0% 100%;
}
</style>
