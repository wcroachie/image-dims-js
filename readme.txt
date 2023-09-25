In javascript, you normally have to get the dimensions of an image by calling new Image() and waiting till it loads, or createImageBitmap. These are both asynchronous.
My function analyzes the actual bytes of the image (as a Uint8Array or Array of bytes), determines what kind of image it is, and finds the dimensions. I'm not fully sure if my method is faster, but it was a nice exercise for me to familiarize myself with using bitwise operators. Enjoy.

Note - if you want to be able to read TIFF files, add utif.js from the photopea source code before this script
Note - .ico and .cur files not yet supported... yet
