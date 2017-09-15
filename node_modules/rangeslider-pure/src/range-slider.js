import * as dom from './utils/dom';
import * as func from './utils/functions';
import './range-slider.css';

const newLineAndTabRegexp = new RegExp('/[\\n\\t]/', 'g');
const MAX_SET_BY_DEFAULT = 100;
const HANDLE_RESIZE_DELAY = 300;
const HANDLE_RESIZE_DEBOUNCE = 50;

const pluginName = 'rangeSlider';
let pluginIdentifier = 0;
const inputrange = dom.supportsRange();
const defaults = {
  polyfill: true,
  rangeClass: 'rangeSlider',
  disabledClass: 'rangeSlider--disabled',
  fillClass: 'rangeSlider__fill',
  bufferClass: 'rangeSlider__buffer',
  handleClass: 'rangeSlider__handle',
  startEvent: ['mousedown', 'touchstart', 'pointerdown'],
  moveEvent: ['mousemove', 'touchmove', 'pointermove'],
  endEvent: ['mouseup', 'touchend', 'pointerup'],
  min: null,
  max: null,
  step: null,
  value: null,
  buffer: null,
  stick: null,
  borderRadius: 10,
  vertical: false
};

/**
 * Plugin
 * @param {HTMLElement} element
 * @param {this} options
 */
export default class RangeSlider {
  constructor(element, options) {
    let minSetByDefault;
    let maxSetByDefault;
    let stepSetByDefault;
    let stickAttribute;
    let stickValues;

    this.element = element;
    this.options = func.simpleExtend(defaults, options);
    this.polyfill = this.options.polyfill;
    this.vertical = this.options.vertical;
    this.onInit = this.options.onInit;
    this.onSlide = this.options.onSlide;
    this.onSlideStart = this.options.onSlideStart;
    this.onSlideEnd = this.options.onSlideEnd;
    this.onSlideEventsCount = -1;
    this.isInteractsNow = false;
    this.needTriggerEvents = false;

    // Plugin should only be used as a polyfill
    if (!this.polyfill) {
      // Input range support?
      if (inputrange) {
        return;
      }
    }

    this.options.buffer = this.options.buffer || parseFloat(this.element.getAttribute('data-buffer'));

    this.identifier = 'js-' + pluginName + '-' + (pluginIdentifier++);

    this.min = func.getFirsNumberLike(
      this.options.min,
      parseFloat(this.element.getAttribute('min')),
      (minSetByDefault = 0)
    );

    this.max = func.getFirsNumberLike(
      this.options.max,
      parseFloat(this.element.getAttribute('max')),
      (maxSetByDefault = MAX_SET_BY_DEFAULT)
    );

    this.value = func.getFirsNumberLike(this.options.value, this.element.value,
      parseFloat(this.element.value || this.min + (this.max - this.min) / 2));

    this.step = func.getFirsNumberLike(this.options.step,
      parseFloat(this.element.getAttribute('step')) || (stepSetByDefault = 1));

    this.percent = null;

    if (func.isArray(this.options.stick) && this.options.stick.length >= 1) {
      this.stick = this.options.stick;
    } else if ((stickAttribute = this.element.getAttribute('stick'))) {
      stickValues = stickAttribute.split(' ');
      if (stickValues.length >= 1) {
        this.stick = stickValues.map(parseFloat);
      }
    }
    if (this.stick && this.stick.length === 1) {
      this.stick.push(this.step * 1.5);
    }
    this._updatePercentFromValue();

    this.toFixed = this._toFixed(this.step);

    let directionClass;

    this.container = document.createElement('div');
    dom.addClass(this.container, this.options.fillClass);

    directionClass = this.vertical ? this.options.fillClass + '__vertical' : this.options.fillClass + '__horizontal';
    dom.addClass(this.container, directionClass);

    this.handle = document.createElement('div');
    dom.addClass(this.handle, this.options.handleClass);

    directionClass = this.vertical ?
      this.options.handleClass + '__vertical' :
      this.options.handleClass + '__horizontal';
    dom.addClass(this.handle, directionClass);

    this.range = document.createElement('div');
    dom.addClass(this.range, this.options.rangeClass);
    this.range.id = this.identifier;
    this.range.appendChild(this.handle);
    this.range.appendChild(this.container);

    directionClass = this.vertical ? this.options.rangeClass + '__vertical' : this.options.rangeClass + '__horizontal';
    dom.addClass(this.range, directionClass);

    if (this.options.bufferClass) {
      this.buffer = document.createElement('div');
      dom.addClass(this.buffer, this.options.bufferClass);
      this.range.appendChild(this.buffer);

      directionClass = this.vertical ?
        this.options.bufferClass + '__vertical' :
        this.options.bufferClass + '__horizontal';
      dom.addClass(this.buffer, directionClass);
    }

    if (func.isNumberLike(this.options.value)) {
      this._setValue(this.options.value, true);
      this.element.value = this.options.value;
    }

    if (func.isNumberLike(this.options.buffer)) {
      this.element.setAttribute('data-buffer', this.options.buffer);
    }

    if (func.isNumberLike(this.options.min) || minSetByDefault) {
      this.element.setAttribute('min', '' + this.min);
    }

    if (func.isNumberLike(this.options.max) || maxSetByDefault) {
      this.element.setAttribute('max', '' + this.max);
    }

    if (func.isNumberLike(this.options.step) || stepSetByDefault) {
      this.element.setAttribute('step', '' + this.step);
    }

    dom.insertAfter(this.element, this.range);

    // hide the input visually
    dom.setCss(this.element, {
      'position': 'absolute',
      'width': '1px',
      'height': '1px',
      'overflow': 'hidden',
      'opacity': '0'
    });

    // Store context
    this._handleDown = this._handleDown.bind(this);
    this._handleMove = this._handleMove.bind(this);
    this._handleEnd = this._handleEnd.bind(this);
    this._startEventListener = this._startEventListener.bind(this);
    this._changeEventListener = this._changeEventListener.bind(this);
    this._handleResize = this._handleResize.bind(this);

    this._init();

    // Attach Events
    window.addEventListener('resize', this._handleResize, false);

    dom.addEventListeners(document, this.options.startEvent, this._startEventListener);

    // Listen to programmatic value changes
    this.element.addEventListener('change', this._changeEventListener, false);
  }

  /* public methods */

  /**
   * @param {Object} obj like {min : Number, max : Number, value : Number, step : Number, buffer : [String|Number]}
   * @param {Boolean} triggerEvents
   * @returns {RangeSlider}
   */
  update(obj, triggerEvents) {
    if (triggerEvents) {
      this.needTriggerEvents = true;
    }
    if (func.isObject(obj)) {
      if (func.isNumberLike(obj.min)) {
        this.element.setAttribute('min', '' + obj.min);
        this.min = obj.min;
      }

      if (func.isNumberLike(obj.max)) {
        this.element.setAttribute('max', '' + obj.max);
        this.max = obj.max;
      }

      if (func.isNumberLike(obj.step)) {
        this.element.setAttribute('step', '' + obj.step);
        this.step = obj.step;
        this.toFixed = this._toFixed(obj.step);
      }

      if (func.isNumberLike(obj.buffer)) {
        this._setBufferPosition(obj.buffer);
      }

      if (func.isNumberLike(obj.value)) {
        this._setValue(obj.value);
      }
    }
    this._update();
    this.onSlideEventsCount = 0;
    this.needTriggerEvents = false;
    return this;
  };

  destroy() {
    dom.removeAllListenersFromEl(this, document);
    window.removeEventListener('resize', this._handleResize, false);
    this.element.removeEventListener('change', this._changeEventListener, false);

    this.element.style.cssText = '';
    delete this.element[pluginName];

    // Remove the generated markup
    if (this.range) {
      this.range.parentNode.removeChild(this.range);
    }
  }

  /**
   * A lightweight plugin wrapper around the constructor,preventing against multiple instantiations
   * @param {Element} el
   * @param {Object} options
   */
  static create(el, options) {
    const createInstance = (el) => {
      let data = el[pluginName];

      // Create a new instance.
      if (!data) {
        data = new RangeSlider(el, options);
        el[pluginName] = data;
      }
    };

    if (el.length) {
      Array.prototype.slice.call(el).forEach(function (el) {
        createInstance(el);
      });
    } else {
      createInstance(el);
    }
  }

  /* private methods */

  _toFixed(step) {
    return (step + '').replace('.', '').length - 1;
  }

  _init() {
    if (this.onInit && typeof this.onInit === 'function') {
      this.onInit();
    }
    this._update();
  }

  _updatePercentFromValue() {
    this.percent = (this.value - this.min) / (this.max - this.min);
  }

  /**
   * This method check if this.identifier exists in ev.target's ancestors
   * @param ev
   * @param data
   */
  _startEventListener(ev, data) {
    const el = ev.target;
    let isEventOnSlider = false;

    if (ev.which !== 1 && !('touches' in ev)) {
      return;
    }

    dom.forEachAncestors(el, el =>
      (isEventOnSlider = el.id === this.identifier && !dom.hasClass(el, this.options.disabledClass)),
    true);

    if (isEventOnSlider) {
      this._handleDown(ev, data);
    }
  }

  _changeEventListener(ev, data) {
    if (data && data.origin === this.identifier) {
      return;
    }

    const value = ev.target.value;
    const pos = this._getPositionFromValue(value);

    this._setPosition(pos);
  }

  _update() {
    const sizeProperty = this.vertical ? 'offsetHeight' : 'offsetWidth';

    this.handleSize = dom.getDimension(this.handle, sizeProperty);
    this.rangeSize = dom.getDimension(this.range, sizeProperty);
    this.maxHandleX = this.rangeSize - this.handleSize;
    this.grabX = this.handleSize / 2;
    this.position = this._getPositionFromValue(this.value);

    // Consider disabled state
    if (this.element.disabled) {
      dom.addClass(this.range, this.options.disabledClass);
    } else {
      dom.removeClass(this.range, this.options.disabledClass);
    }

    this._setPosition(this.position);
    if (this.options.bufferClass && this.options.buffer) {
      this._setBufferPosition(this.options.buffer);
    }
    this._updatePercentFromValue();
    dom.triggerEvent(this.element, 'change', {origin: this.identifier});
  }

  _handleResize() {
    return func.debounce(() => {
      // Simulate resizeEnd event.
      func.delay(() => {
        this._update();
      }, HANDLE_RESIZE_DELAY);
    }, HANDLE_RESIZE_DEBOUNCE)();
  }

  _handleDown(e) {
    this.isInteractsNow = true;
    e.preventDefault();
    dom.addEventListeners(document, this.options.moveEvent, this._handleMove);
    dom.addEventListeners(document, this.options.endEvent, this._handleEnd);

    // If we click on the handle don't set the new position
    if ((' ' + e.target.className + ' ').replace(newLineAndTabRegexp, ' ').indexOf(this.options.handleClass) > -1) {
      return;
    }

    const boundingClientRect = this.range.getBoundingClientRect();

    const posX = this._getRelativePosition(e);
    const rangeX = this.vertical ? boundingClientRect.bottom : boundingClientRect.left;
    const handleX = this._getPositionFromNode(this.handle) - rangeX;
    const position = posX - this.grabX;

    this._setPosition(position);

    if (posX >= handleX && posX < handleX + this.options.borderRadius * 2) {
      this.grabX = posX - handleX;
    }
    this._updatePercentFromValue();
  }

  _handleMove(e) {
    const posX = this._getRelativePosition(e);

    this.isInteractsNow = true;
    e.preventDefault();
    this._setPosition(posX - this.grabX);
  }

  _handleEnd(e) {
    e.preventDefault();
    dom.removeEventListeners(document, this.options.moveEvent, this._handleMove);
    dom.removeEventListeners(document, this.options.endEvent, this._handleEnd);

    // Ok we're done fire the change event
    dom.triggerEvent(this.element, 'change', {origin: this.identifier});

    if (this.isInteractsNow || this.needTriggerEvents) {
      if (this.onSlideEnd && typeof this.onSlideEnd === 'function') {
        this.onSlideEnd(this.value, this.percent, this.position);
      }
    }
    this.onSlideEventsCount = 0;
    this.isInteractsNow = false;
  }

  _setPosition(pos) {
    let position;
    let stickRadius;
    let restFromValue;
    let stickTo;

    // Snapping steps
    let value = this._getValueFromPosition(func.between(pos, 0, this.maxHandleX));

    // Stick to stick[0] in radius stick[1]
    if (this.stick) {
      stickTo = this.stick[0];
      stickRadius = this.stick[1] || 0.1;
      restFromValue = value % stickTo;
      if (restFromValue < stickRadius) {
        value = value - restFromValue;
      } else if (Math.abs(stickTo - restFromValue) < stickRadius) {
        value = value - restFromValue + stickTo;
      }
    }
    position = this._getPositionFromValue(value);

    // Update ui
    if (this.vertical) {
      this.container.style.height = (position + this.grabX) + 'px';
      this.handle.style.transform = 'translateY(-' + position + 'px)';
      this.handle.style['-ms-transform'] = 'translateY(-' + position + 'px)';
    } else {
      this.container.style.width = (position + this.grabX) + 'px';
      this.handle.style.transform = 'translateX(' + position + 'px)';
      this.handle.style['-ms-transform'] = 'translateX(' + position + 'px)';
    }

    this._setValue(value);

    // Update globals
    this.position = position;
    this.value = value;
    this._updatePercentFromValue();

    if (this.isInteractsNow || this.needTriggerEvents) {
      if (this.onSlideStart && typeof this.onSlideStart === 'function' && this.onSlideEventsCount === 0) {
        this.onSlideStart(this.value, this.percent, this.position);
      }

      if (this.onSlide && typeof this.onSlide === 'function') {
        this.onSlide(this.value, this.percent, this.position);
      }
    }

    this.onSlideEventsCount++;
  }

  _setBufferPosition(pos) {
    let isPercent = true;

    if (isFinite(pos)) {
      pos = parseFloat(pos);
    } else if (func.isString(pos)) {
      if (pos.indexOf('px') > 0) {
        isPercent = false;
      }
      pos = parseFloat(pos);
    } else {
      console.warn('New position must be XXpx or XX%');
      return;
    }

    if (isNaN(pos)) {
      console.warn('New position is NaN');
      return;
    }
    if (!this.options.bufferClass) {
      console.warn('You disabled buffer, it\'s className is empty');
      return;
    }
    let bufferSize = isPercent ? pos : (pos / this.rangeSize * 100);

    if (bufferSize < 0) {
      bufferSize = 0;
    }
    if (bufferSize > 100) {
      bufferSize = 100;
    }
    this.options.buffer = bufferSize;

    let paddingSize = this.options.borderRadius / this.rangeSize * 100;
    let bufferSizeWithPadding = bufferSize - paddingSize;

    if (bufferSizeWithPadding < 0) {
      bufferSizeWithPadding = 0;
    }

    if (this.vertical) {
      this.buffer.style.height = bufferSizeWithPadding + '%';
      this.buffer.style.bottom = paddingSize * 0.5 + '%';
    } else {
      this.buffer.style.width = bufferSizeWithPadding + '%';
      this.buffer.style.left = paddingSize * 0.5 + '%';
    }

    this.element.setAttribute('data-buffer', bufferSize);
  }

  /**
   *
   * @param {Element} node
   * @returns {*} Returns element position relative to the parent
   * @private
   */
  _getPositionFromNode(node) {
    let i = this.vertical ? this.maxHandleX : 0;

    while (node !== null) {
      i += this.vertical ? node.offsetTop : node.offsetLeft;
      node = node.offsetParent;
    }
    return i;
  }

  /**
   *
   * @param {(MouseEvent|TouchEvent)}e
   * @returns {number}
   */
  _getRelativePosition(e) {
    const boundingClientRect = this.range.getBoundingClientRect();

    // Get the offset relative to the viewport
    const rangeSize = this.vertical ? boundingClientRect.bottom : boundingClientRect.left;
    let pageOffset = 0;

    const pagePositionProperty = this.vertical ? 'pageY' : 'pageX';

    if (typeof e[pagePositionProperty] !== 'undefined') {
      pageOffset = (e.touches && e.touches.length) ? e.touches[0][pagePositionProperty] : e[pagePositionProperty];
    } else if (typeof e.originalEvent !== 'undefined') {
      if (typeof e.originalEvent[pagePositionProperty] !== 'undefined') {
        pageOffset = e.originalEvent[pagePositionProperty];
      } else if (e.originalEvent.touches && e.originalEvent.touches[0] &&
        typeof e.originalEvent.touches[0][pagePositionProperty] !== 'undefined') {
        pageOffset = e.originalEvent.touches[0][pagePositionProperty];
      }
    } else if (e.touches && e.touches[0] && typeof e.touches[0][pagePositionProperty] !== 'undefined') {
      pageOffset = e.touches[0][pagePositionProperty];
    } else if (e.currentPoint && (typeof e.currentPoint.x !== 'undefined' || typeof e.currentPoint.y !== 'undefined')) {
      pageOffset = this.vertical ? e.currentPoint.y : e.currentPoint.x;
    }

    if (this.vertical) {
      pageOffset -= window.pageYOffset;
    }

    return this.vertical ? rangeSize - pageOffset : pageOffset - rangeSize;
  }

  _getPositionFromValue(value) {
    const percentage = (value - this.min) / (this.max - this.min);
    const pos = percentage * this.maxHandleX;

    return isNaN(pos) ? 0 : pos;
  }

  _getValueFromPosition(pos) {
    const percentage = ((pos) / (this.maxHandleX || 1));
    const value = this.step * Math.round(percentage * (this.max - this.min) / this.step) + this.min;

    return Number((value).toFixed(this.toFixed));
  }

  _setValue(value, force) {
    if (value === this.value && !force) {
      return;
    }

    // Set the new value and fire the `input` event
    this.element.value = value;
    this.value = value;
    dom.triggerEvent(this.element, 'input', {origin: this.identifier});
  }
}
