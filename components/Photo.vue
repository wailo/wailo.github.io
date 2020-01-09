<template>
  <pre class="ascii">{{ updatedPhoto }}</pre>
</template>

<script>
const replaceAt = function(str, index, replacement) {
  return (
    str.substr(0, index) + replacement + str.substr(index + replacement.length)
  )
}

export default {
  data: () => {
    return {
      updatedPhoto: '',
      originalPhoto: `
                       .':wwwww:,.                       
                 .,wwWWWWWWWWWWWWWWWw:.                  
              ;wWWWWWWWWWWwwWWWWWWWWWWWWWw.              
           :WWWWWWWWWWWWWWWWWWWwwwwwWWWWWWWWw.           
        .wWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwWWWWw'         
       wWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwwwwwwww.       
     'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwwwwwwww:;      
    .WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwwwww;:;ww;     
    WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWww;',''',,    
   ;WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwww,'. ..;    
   wWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWww'.   . .   
   WWWWWWw   .'':wWWWWWWWWWWWWWWWWWWWWWwww:www,.    ..   
   WWWWw     ..     wWWWWWWWWWWWw,..         ..   . .'   
   WWWWwwwwWWWWWWWw;  'WWWWWWWw.':wwwWWWWww:,.   .,  '   
   WWWWWWwwwwwwwWWWWw. wWWWWWWwwWWWWWWWWWWWWWw,  ;w  '   
   WWWWw;:.wW. . WWWWw ,WWWWWWwWWWWWW , ;Wwwwwwww:w. '   
  ;WWWWWWWWWWw:wWWWWWW;wWWWWWWWWWWWWWww;WWw''wWWWww, w:, 
 :wWWWWWWWWWWWWWWWWWWWwWWWWWWWWWWWWWWWWWWWWWWWWWWWww:;.' 
 .WWWWWWWWWWWWWWWWWWWwWWWWWWWWWWWWWWWWWWWWWWWWWWWww;:;w  
  WWWWWWWWWWWWWWWWWWwWWWWWWWWWWWWWWWWWWWWWWWWWWWWW:',W:  
  WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWw;.wWw  
 .'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW:. :WW  
 ',wWWWWWWWWWWWWWWWww;:wwWWWwww:wWWWWWWWWWWWWWWWw'  wWw  
  wwwwWWWWWWWWWWWWWWWw;':wWwwwwwwWWWWWWWWWWWWWww;.  ww.  
  wwwwWWWWWWWWWWWWWWWwwwWWWWWWWWWWWWWWWWWWWWWWww'  :w'   
   .wwwWWWWWWwwwwwwwwwwWWWWWWWWWWWWWWWWWWWWWWWw,  ..     
    wwwwwWWWwwWWWwwwWWWWWWWWWWWWWWWWWWWWWWWwww;   ,      
    ,;,;,wWwwww''.  ,wwWWWWWWww;,...:wWWWWwww;.   .      
     w....'ww:,'.wwWWWWWWWWWWWWWWWWwwwWWWW;.''   ,       
     .'    ..';:wwwwwWWWwwwwWWWWWWWWWWwwWw      .        
      ..       .wwwWWWWWWWwWWWWWWWWWWw:'.      .         
       .'       ;wWWWWWWWWWWWWWWWWWWw,        .          
         '       ;::wWWWWWWWWWWWWWWww.       .           
         ;          .wwWWWWWWWWWwww'.        .           
         w            'wwWwWWww;,.           .           
        .,             .;';:;,.              .           
    ....W'                                   . .         
      `
    }
  },
  mounted() {
    this.updatedPhoto = this.originalPhoto.replace(/\w/g, ' ')
    this.$nextTick(function() {
      const vm = this
      vm.shufflePhoto()
    })
  },
  methods: {
    shufflePhoto() {
      const el = this

      let index = Math.ceil(Math.random() * (el.originalPhoto.length - 1))
      while (
        el.updatedPhoto !== el.originalPhoto &&
        el.originalPhoto[index] === el.updatedPhoto[index]
      ) {
        index = Math.ceil(Math.random() * (el.originalPhoto.length - 1))
      }
      if (el.updatedPhoto === el.originalPhoto) {
        return
      }

      el.updatedPhoto = replaceAt(
        el.updatedPhoto,
        index,
        el.originalPhoto[index]
      )
      setTimeout(() => {
        el.shufflePhoto()
      }, 10)
    }
  }
}
</script>

<style scoped>
.NuxtLogo {
  animation: 1s appear;
}

@keyframes appear {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.photo {
  color: chartreuse;
  font-size: 4pt;
}
.ascii {
  display: inline-block;
  font-family: monospace;
  letter-spacing: -0.1em;
  line-height: 1em;
  /* text-shadow: 0 0 5px rgba(100, 100, 100, 0.5); */
  background-color: transparent;
  /* color: white; */
  /* color: rgba(182, 182, 182, 1.068); */
}
</style>
