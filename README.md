# rangeSlider

> Simple, small and fast vanilla JavaScript polyfill for the HTML5 `<input type="range">` slider element.
> Forked from [André Ruffert's jQuery plugin](https://github.com/andreruffert/rangeslider.js)

Check out the [examples](http://stryzhevskyi.github.io/rangeSlider/).

* Touchscreen friendly
* Recalculates `onresize` so suitable for use within responsive designs
* Small and fast
* Supports all major browsers
* Buffer progressbar (for downloading progress etc.)

## Install
Install with [npm](https://www.npmjs.com/package/rangeslider-pure):
``npm install --save rangeslider-pure``

Install with [Bower](http://bower.io/):
``bower install --save rangeslider-pure``

## Usage

```js
// Initialize a new plugin instance for one element or NodeList of elements.
var slider = document.querySelectorAll('input[type="range"]');
rangeSlider.create(slider, {
    polyfill: true,     // Boolean, if true, custom markup will be created
    rangeClass: 'rangeSlider',
    disabledClass: 'rangeSlider--disabled',
    fillClass: 'rangeSlider__fill',
    bufferClass: 'rangeSlider__buffer',
    handleClass: 'rangeSlider__handle',
    startEvent: ['mousedown', 'touchstart', 'pointerdown'],
    moveEvent: ['mousemove', 'touchmove', 'pointermove'],
    endEvent: ['mouseup', 'touchend', 'pointerup'],
    vertical: false,    // Boolean, if true slider will be displayed in vertical orientation
    min: null,          // Number , 0
    max: null,          // Number, 100
    step: null,         // Number, 1
    value: null,        // Number, center of slider
    buffer: null,       // Number, in percent, 0 by default
    stick: null,        // [Number stickTo, Number stickRadius] : use it if handle should stick to stickTo-th value in stickRadius
    borderRadius: 10,   // Number, if you use buffer + border-radius in css for looks good,
    onInit: function () {
        console.info('onInit')
    },
    onSlideStart: function (position, value) {
        console.info('onSlideStart', 'position: ' + position, 'value: ' + value);
    },
    onSlide: function (position, value) {
        console.log('onSlide', 'position: ' + position, 'value: ' + value);
    },
    onSlideEnd: function (position, value) {
        console.warn('onSlideEnd', 'position: ' + position, 'value: ' + value);
    }
});

// update position
var triggerEvents = true; // or false
slider.rangeSlider.update({min : 0, max : 20, step : 0.5, value : 1.5, buffer : 70}, triggerEvents);

```

```html
<input
    type="range"
    min="0"
    max="100"
    step="1"
    data-buffer="60" />
```


## License
MIT
