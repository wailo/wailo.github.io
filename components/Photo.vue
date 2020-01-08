<template>
  <pre class="NuxtLogo ascii">{{ updatedPhoto }}</pre>
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
                       .':llool:,.                       
                 .,lkKMMMWWWWWMMMMW0d:.                  
              ;xNMWWWNXK0OxxOKXXKXXNWMMWOc.              
           :OMMWXK00000KXNWNKKOkkxdxO0KXNWWXl.           
        .dWWWWKK000KXNWMMMMMMWWXK00O00KOOkOKNNx'         
       dMMMMMWNNXNNWMMMMMMMMMMMMMMWWWNX0Odoooxddl.       
     'NMMMMMMWNXNNNWMMMMMMMMMMMMMMMMMMWKOxdolcclc:;      
    .WMMMMMWNKK0KXNWMMMMMMMMMMMMMMMMMMMNKkkxlc;:;cc;     
    XMMMMMWNK0OOKXXNWMMMMMMMMMMMMMMMWNXX00Okd;',''',,    
   ;MMMMMWXXXXNWWMMMMMMMMMMMMMMMMMMMMMWNK0Okkl,'. ..;    
   kMMMMMWNXXWWMMMMMMMMMMMMMMMMMMMMMMMMMWX0Oxc'.   . .   
   0MMMMKc   .'':dKWMMMMMMMMMMMMMMMMWN0xxc:lko,.    ..   
   NMMWc     ..     cOWMMMMMMMMKo,..         ..   . .'   
   WMMKocokKNMMWNKx;  'OMMMMMMd.':dxkO00Odo:,.   .,  '   
   MMM0OXkkdxxxkKWXKk. xMMMMMNxkXWWWMMMMMMWWOl,  ;c  '   
   MMMXx;:.lX. . WNKXd ,WMMMMNxXWNNW0 , ;0oclloxc:l. '   
  ;MMMWXXWOKXk:dKMMMXN;cWMMMMW0NWWMMMol;XMk''lKMXdl, l:, 
 :kMMMMMMWXKXWWMMMMMW0oOMMMMMWXWMMMMMMMMMMMWXXWMWOll:;.' 
 .XMMMMMMMMMMMMMMMMMNk0WMMMMMMNNWMMMMMMMMMMMMMMMNkc;:;o  
  WMMMMMMMMMMMMMMMMWxXMMMMMMMMWXXMMMMMMMMMMMMMMMXO:',X:  
  0MWWMMMMMMMMMMMMMNXMMMMMMMMMWNNNMMMMMMMMMMMMMWXo;.oMx  
 .'KKK0XXNMMMMMMMMMMMMMMMMMMMMMMMWWMMMMMMMMMMMWN0:. :0K  
 ',d000000NMMMMMMMKlo;:lkNMNkoc:k0WMMMMMMMMMMWX0o'  oKk  
  xlkkOOXNNMMMMMMMMKOo;':c0dddlxkXMMMMMMMMMWWXkx;.  xo.  
  cxlxOOKNNWNWX0KXXOOxkxWMMWWKK0KWWMMMMMMMMNXKkc'  :x'   
   .dlxO0KNX0dxkxxooxkkXWWNNWXXKKKKWWMWWWWNXO0d,  ..     
    occddOXKkdO00koxOOOOKKNNNWXXK0KNNNXNXK0dxo;   ,      
    ,;,;,d0kdol''.  ,co0K0KKKkc;,...:oXNX0xlc;.   .      
     c....'dx:,'.ok0XNWMMMMMMMWNXX0kxkXWNO;.''   ,       
     .'    ..';:cloxkKN0xkxkKNNNXKO0KKkkOc      .        
      ..       .cxxOK00OO0kOO0KXNXKKKx:'.      .         
       .'       ;xOKXXK00KKXKNWWWNKOd,        .          
         '       ;::kO0KXWNXKXNNNNKxl.       .           
         ;          .ckNWWWWX0OOkoc'.        .           
         l            'okOk0Okc;,.           .           
        .,             .;';:;,.              .           
    ....O'                                   . .         
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

      // if (!index) {
      // index = 0
      // }
      // if (
      //   index > el.originalPhoto.length - 1 ||
      //   el.updatedPhoto === el.originalPhoto
      // ) {
      //   return
      // }

      let index = Math.ceil(Math.random() * (el.originalPhoto.length - 1))
      while (
        el.updatedPhoto !== el.originalPhoto &&
        el.originalPhoto[index] === el.updatedPhoto[index]
      ) {
        // index = (index + 1) % (el.originalPhoto.length - 1)
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
        // const randomStr = '123456789'
        // const newChar = Math.random()
        //   .toString(36)
        //   .substring(2, 3)
        // el.updatedPhoto = el.originalPhoto.replace(/M/g, newChar)
        // index++
        el.shufflePhoto()
      }, 5)
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
  /* display: inline-block; */
  /* font-family: monospace; */
  /* letter-spacing: -0.1em; */
  /* line-height: 0.8em; */
  /* text-shadow: 0 0 5px rgba(100, 100, 100, 0.5); */
  color: greenyellow;

  font-family: monospace;
  font-size: 8px;
  font-style: normal;
  font-variant: normal;
  font-weight: 400;
  line-height: 10px;
}
</style>
