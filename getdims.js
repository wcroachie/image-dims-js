function getDimsSync( arr ){

  arr = [...arr];

  var
    head_arr = arr.slice(0,8192),
    pointer,
    binary = false,
    w=0,
    h=0;

  /**
   * https://mimesniff.spec.whatwg.org/#binary-data-byte
   * check for binary bytes (if there are none, it's probably
   * svg or some other plaintext image type)
   */
  
  for(
    pointer = 0;
    pointer < head_arr.length;
    pointer++
  ){
    switch( head_arr[ pointer ] ){
      case 0x00:
      case 0x01:
      case 0x02:
      case 0x03:
      case 0x04:
      case 0x05:
      case 0x06:
      case 0x07:
      case 0x08:
      case 0x0b:
      case 0x0e:
      case 0x0f:
      case 0x11:
      case 0x12:
      case 0x13:
      case 0x14:
      case 0x15:
      case 0x16:
      case 0x17:
      case 0x18:
      case 0x19:
      case 0x1a:
      case 0x1c:
      case 0x1d:
      case 0x1e:
      case 0x1f:
        binary = true;
        break;
      default:
        break;
    }
    if(binary){
      break;
    }
  }

  pointer = 0;

  if(binary){
    


    /* webp */
    /* https://stackoverflow.com/a/75393561 */
    if(
          head_arr[8]   == 0x57 /* W */
      &&  head_arr[9]   == 0x45 /* E */
      &&  head_arr[10]  == 0x42 /* B */
      &&  head_arr[11]  == 0x50 /* P */
    ){

      if(
            head_arr[12] == 0x56  /* V */
        &&  head_arr[13] == 0x50  /* P */
        &&  head_arr[14] == 0x38  /* 8 */
      ){

        /* lossy */
        if(head_arr[15] == 0x20 /* <space> */){
          
          w = head_arr[27] << 8 | head_arr[26] & 0x3fff;
          h = head_arr[29] << 8 | head_arr[28] & 0x3fff;
          
          return [w,h];
        
        /* extended */
        }else if(head_arr[15] == 0x58 /* X */){
          
          w = 1 + ( head_arr[26] << 16 | head_arr[25] << 8 | head_arr[24] );
          h = 1 + ( head_arr[29] << 16 | head_arr[28] << 8 | head_arr[27] );
          return [w,h];

        /* lossless */
        }else if(head_arr[15] == 0x4c /* L */){
          
          /* test1-lossless - 1924 x 1223 (1923 x 1222 before adding 1) */
          /*
          
             21        22            23        24
          10000011  10000111      00110001  00010001
          '------'  '------'      '------'  '------'
                \   /                   \   /
                 \ /                     \ /
                  X                       X
                 / \                     / \
                /   \                   /   \
          .------..------.          .------..------.
          1000011110000011          0001000100110001
          |/      &                 XXXX     &
          / 11111111111111              111111111111
         /        |                           | 
        /         V                           V
        |   00011110000011  (1923)      000100110001   2 shift left
        |   width (add 1)                   << 2
        |                             000100110001--
        \                                   &
         `----------------------------00000000000010
                                            |
                                            V
                                      00010011000110  (1222)
                                      height (add 1)

          */

          /* note - the width and height will have a 1 added at the end */
          
          var first2bytes = head_arr[21] | (head_arr[22] << 8);
          w = first2bytes & 0x3fff;
          var left2bits = (first2bytes & 0xc000) >> 14;
          h = ((( head_arr[23] | (head_arr[24] << 8) ) & 0xfff) << 2) | left2bits;
          w += 1;
          h += 1;
          return [w,h];

        }else{
          /* throw bad webp */
          throw "unrecognized or broken webP variant"
        }
      }else{
        /* throw bad webp */
        throw "unrecognized or broken webP variant"
      }
    }


    /* avif, heic, or heif */
    /* see https://stackoverflow.com/a/66555075 */
    /* get dims from after last ispebox in the file (?) */
    if(
          head_arr[4] == 0x66 /* f */
      &&  head_arr[5] == 0x74 /* t */
      &&  head_arr[6] == 0x79 /* y */
      &&  head_arr[7] == 0x70 /* p */
    ){

      var ispeboxes = [];

      for( pointer=0; pointer<arr.length; pointer++){
        if(
              arr[ pointer - 3] == 0x69 /* i */
          &&  arr[ pointer - 2] == 0x73 /* s */
          &&  arr[ pointer - 1] == 0x70 /* p */
          &&  arr[ pointer ] == 0x65    /* e */
        ){
          ispeboxes.push( arr.slice(pointer+1,pointer+13) );
        }
      }

      pointer = 0;

      var ispebox = ispeboxes.pop();
      
      for( pointer=4; pointer<8; pointer++ ){
        w <<= 8;
        w |= ispebox[ pointer ];
        h <<= 8;
        h |= ispebox[ pointer+4 ];
      }

      return[w,h];
    }



    /* bmp */
    if(
          head_arr[0] == 0x42 /* B */
      &&  head_arr[1] == 0x4d /* M */
    ){
      w = head_arr[21] << 24 | head_arr[20] << 16 | head_arr[19] << 8 | head_arr[18];
      h = head_arr[25] << 24 | head_arr[24] << 16 | head_arr[23] << 8 | head_arr[22];
      return [w,h];
    }


    /******************* gif */
    if(
          head_arr[0] == 0x47 /* G */
      &&  head_arr[1] == 0x49 /* I */
      &&  head_arr[2] == 0x46 /* F */
    ){
      w = head_arr[7] << 8 | head_arr[6];
      h = head_arr[9] << 8 | head_arr[8];
      return [w,h];
    }

    /******************* jpeg */
    if(
          head_arr[0] == 0xff
      &&  head_arr[1] == 0xd8
      &&  head_arr[2] == 0xff
    ){
      /* https://stackoverflow.com/questions/2517854/getting-image-size-of-jpeg-from-its-binary */
      /* https://web.archive.org/web/20131016210645/http://www.64lines.com/jpeg-width-height */
      /* adapted from https://stackoverflow.com/a/63479164 */
      pointer = 0;
      var marker = 0;
      w = 0, h = 0;
      while (pointer < arr.length) {
        if (arr[pointer] != 0xff ) {
          throw new Error("error parsing jpeg at byte "+pointer);
        }
        marker = arr[++pointer];
        if( marker == 0x01 || ( marker >= 0xd0 && marker <= 0xd9 ) ){
          pointer++;
          continue;
        }
        if (marker == 0xc0 || marker == 0xc2 ) {
          break;
        }
        let adv = arr[pointer+1] << 8 | arr[pointer+2];
        pointer += adv + 1;
      }
      w = arr[ pointer + 6 ] << 8 | arr[ pointer + 7 ];
      h = arr[ pointer + 4 ] << 8 | arr[ pointer + 5 ];
      return [w,h];
    }

    /******************* png and apng */
    if(
          head_arr[0] == 0x89
      &&  head_arr[1] == 0x50 /* P */
      &&  head_arr[2] == 0x4e /* N */
      &&  head_arr[3] == 0x47 /* G */
      &&  head_arr[4] == 0x0d
      &&  head_arr[5] == 0x0a
      &&  head_arr[6] == 0x1a
      &&  head_arr[7] == 0x0a
    ){
      /* png and apng */
      /* adpated from https://itecnote.com/tecnote/javascript-get-height-and-width-dimensions-from-base64-png/
      observations - seems to work with both png and apng */
      var acc;
      acc = head_arr[16];
      acc <<= 24;
      acc |= head_arr[17];
      acc <<= 16;
      acc |= head_arr[18];
      acc <<= 8;
      acc |= head_arr[19];
      w = acc;
      acc = head_arr[20];
      acc <<= 24;
      acc |= head_arr[21];
      acc <<= 16;
      acc |= head_arr[22];
      acc <<= 8;
      acc |= head_arr[23];
      h = acc;
      acc = null;
      return [w,h];
    }

    /******************* tiff */
    if(
      (
            head_arr[0] == 0x49 /* I */
        &&  head_arr[1] == 0x20 /* <space> */
        &&  head_arr[2] == 0x49 /* I */
      )

      || (
            head_arr[0] == 0x49 /* I */
        &&  head_arr[1] == 0x49 /* I */
        &&  head_arr[2] == 0x2a /* <asterisk> */
      )

      || (
            head_arr[0] == 0x4d /* M */
        &&  head_arr[1] == 0x4d /* M */
        &&  head_arr[2] == 0x00 
        &&  head_arr[3] == 0x2a /* <asterisk> */
      )
    ){
      /**
       * @requires libs/utif.js
       */
      if( typeof UTIF !== "object" ){
        throw "cannot read tiff image, UTIF not installed (use utif.js from photopea)"
      }
      var embeddedimages = UTIF.decode(arr);
      var widths = [], heights=[];
      pointer = 0;
      for( pointer=0; pointer< embeddedimages.length; pointer++){
        widths.push(embeddedimages[pointer].t256);
        heights.push(embeddedimages[pointer].t257);
      }
      w = Math.max(...widths);
      h = Math.max(...heights);
      return [w,h];
    }


    /******************* cur and ico */
    if(
          head_arr[0] == 0x00
      &&  head_arr[1] == 0x00
      && (
        head_arr[2] == 0x01 || head_arr[2] == 0x02
      ) &&
      head_arr[3] == 0x00
    ){
      var numicons = head_arr.slice(4,6);
      numicons = new Uint16Array(numicons.buffer)[0];
      console.log(numicons);
      /**
       * @todo
       * @todo
       * @todo
       * @todo
       * @todo
       * @todo
       * @todo
       * @todo
       * @todo
       * @todo
       * @todo
       * @todo
       * @todo find way to get dims of ico and cur images
       */
    }
    
    /* if none of the above, throw an error */
    throw "unrecognized or broken binary image format"

  }else{
    /* an image that is plaintext */
    /* probably svg, use regex */

    if( typeof document === "object" ){
      
      /* measure via DOM */
      var div = document.createElement("div");
      var str = arr.map(e=>String.fromCodePoint(e)).join("");
      div.innerHTML = str;
      div.style = `
        all:unset;
        display:block;
        position:absolute;
        left:0;
        top:0;
        width:fit-content;
        height:fit-content;
      `;
      document.documentElement.appendChild(div);
      w = div.getBoundingClientRect().width;
      h = div.getBoundingClientRect().height;
      div.remove();
      if( w && h){
        return [w,h];
      }else{
        throw "unrecognized or broken plaintext image format"
      }

    }else{
      /* probably in worker, use regex? */
      var head_str = head_arr.map(e=>String.fromCodePoint(e)).join("");
      head_str = head_str.toLowerCase();
      /* viewbox will override width and height */
      var viewbox = head_str.match(/\sviewbox=(.*?)\s(.*?)\s(.*?)\s(.*?)\s/)?.[0];
      if(!viewbox){

        w = head_str.match(/\swidth=(.*?)\s/)[0].split(/=/)[1];
        h = head_str.match(/\sheight=(.*?)\s/)[0].split(/=/)[1];
        w = parseFloat(w.match(/^('|")/) ? w.slice(1,-2) : w);
        h = parseFloat(h.match(/^('|")/) ? h.slice(1,-2) : h);

      }else{
        var viewboxNums = viewbox.split(/=/)[1].slice(1,-1).split(/\s/).map(e=>parseFloat(e));
        w = viewboxNums[2]-viewboxNums[0];
        h = viewboxNums[3]-viewboxNums[1];
      }
      if( w && h){
        return [w,h];
      }else{
        throw "unrecognized or broken plaintext image format"
      }
    } 
  }        
}
