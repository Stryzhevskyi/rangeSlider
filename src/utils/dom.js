import * as func from './functions';

const EVENT_LISTENER_LIST = 'eventListenerList';

/**
 * Check if a `element` is visible in the DOM
 *
 * @param  {Element}  element
 * @return {Boolean}
 */
export const isHidden = (element) => (
  element.offsetWidth === 0 || element.offsetHeight === 0 || element.open === false
);
/**
 * Get hidden parentNodes of an `element`
 *
 * @param  {Element} element
 * @return {[type]}
 */
export const getHiddenParentNodes = (element) => {
  const parents = [];
  let node = element.parentNode;

  while (isHidden(node)) {
    parents.push(node);
    node = node.parentNode;
  }
  return parents;
};

/**
 * Returns dimensions for an element even if it is not visible in the DOM.
 *
 * @param  {Element} element
 * @param  {string}  key     (e.g. offsetWidth …)
 * @return {Number}
 */
export const getDimension = (element, key) => {
  const hiddenParentNodes = getHiddenParentNodes(element);
  const hiddenParentNodesLength = hiddenParentNodes.length;
  const displayProperty = [];
  let dimension = element[key];

  // Used for native `<details>` elements
  function toggleOpenProperty(element) {
    if (typeof element.open !== 'undefined') {
      element.open = !element.open;
    }
  }

  if (hiddenParentNodesLength) {
    for (let i = 0; i < hiddenParentNodesLength; i++) {
      // Cache the display property to restore it later.
      displayProperty[i] = hiddenParentNodes[i].style.display;

      hiddenParentNodes[i].style.display = 'block';
      hiddenParentNodes[i].style.height = '0';
      hiddenParentNodes[i].style.overflow = 'hidden';
      hiddenParentNodes[i].style.visibility = 'hidden';
      toggleOpenProperty(hiddenParentNodes[i]);
    }

    dimension = element[key];

    for (let j = 0; j < hiddenParentNodesLength; j++) {
      toggleOpenProperty(hiddenParentNodes[j]);
      hiddenParentNodes[j].style.display = displayProperty[j];
      hiddenParentNodes[j].style.height = '';
      hiddenParentNodes[j].style.overflow = '';
      hiddenParentNodes[j].style.visibility = '';
    }
  }
  return dimension;
};

/**
 *
 * @param {HTMLElement} el
 * @param {Object} cssObj
 * @returns {*}
 */
export const setCss = (el, cssObj) => {
  for (const key in cssObj) {
    el.style[key] = cssObj[key];
  }
  return el.style;
};

/**
 *
 * @param {HTMLElement} elem
 * @param {string} className
 */
export const hasClass = (elem, className) => new RegExp(' ' + className + ' ').test(' ' + elem.className + ' ');

/**
 *
 * @param {HTMLElement} elem
 * @param {string} className
 */
export const addClass = (elem, className) => {
  if (!hasClass(elem, className)) {
    elem.className += ' ' + className;
  }
};

/**
 *
 * @param {HTMLElement} elem
 * @param {string} className
 */
export const removeClass = (elem, className) => {
  let newClass = ' ' + elem.className.replace(/[\t\r\n]/g, ' ') + ' ';

  if (hasClass(elem, className)) {
    while (newClass.indexOf(' ' + className + ' ') >= 0) {
      newClass = newClass.replace(' ' + className + ' ', ' ');
    }
    elem.className = newClass.replace(/^\s+|\s+$/g, '');
  }
};

/**
 *
 * @param {HTMLElement} el
 * @callback callback
 * @param {boolean} andForElement - apply callback for el
 * @returns {HTMLElement}
 */
export const forEachAncestors = (el, callback, andForElement) => {
  if (andForElement) {
    callback(el);
  }

  while (el.parentNode && !callback(el)) {
    el = el.parentNode;
  }

  return el;
};

/**
 *
 * @param {HTMLElement} el
 * @param {string} name event name
 * @param {Object} data
 */
export const triggerEvent = (el, name, data) => {
  if (!func.isString(name)) {
    throw new TypeError('event name must be String');
  }
  if (!(el instanceof HTMLElement)) {
    throw new TypeError('element must be HTMLElement');
  }
  name = name.trim();
  const event = document.createEvent('CustomEvent');

  event.initCustomEvent(name, false, false, data);
  el.dispatchEvent(event);
};

/**
 * @param {Object} referenceNode after this
 * @param {Object} newNode insert this
 */
export const insertAfter = (referenceNode, newNode) =>
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);

/**
 * Add event listeners and push them to el[EVENT_LISTENER_LIST]
 * @param {HTMLElement} el DOM element
 * @param {Array} events
 * @callback listener
 */
export const addEventListeners = (el, events, listener) => {
  events.forEach(function (eventName) {
    if (!el[EVENT_LISTENER_LIST]) {
      el[EVENT_LISTENER_LIST] = {};
    }
    if (!el[EVENT_LISTENER_LIST][eventName]) {
      el[EVENT_LISTENER_LIST][eventName] = [];
    }

    el.addEventListener(
      eventName,
      listener,
      window.PointerEvent ? {passive: false} : false
    );
    if (el[EVENT_LISTENER_LIST][eventName].indexOf(listener) < 0) {
      el[EVENT_LISTENER_LIST][eventName].push(listener);
    }
  });
};

/**
 * Remove event listeners and remove them from el[EVENT_LISTENER_LIST]
 * @param {HTMLElement} el DOM element
 * @param {Array} events
 * @callback listener
 */
export const removeEventListeners = (el, events, listener) => {
  events.forEach(function (eventName) {
    let index;

    el.removeEventListener(
      eventName,
      listener,
      false
    );

    if (el[EVENT_LISTENER_LIST] && el[EVENT_LISTENER_LIST][eventName] &&
      (index = el[EVENT_LISTENER_LIST][eventName].indexOf(listener)) > -1
    ) {
      el[EVENT_LISTENER_LIST][eventName].splice(index, 1);
    }
  });
};

/**
 * Remove ALL event listeners which exists in el[EVENT_LISTENER_LIST]
 * @param {HTMLElement} el DOM element
 */
export const removeAllListenersFromEl = (instance, el) => {
  if (!el[EVENT_LISTENER_LIST]) {
    return;
  }
  /* jshint ignore:start */

  /**
   *
   * @callback listener
   * @this {Object} event name
   */
  function rm(listener) {
    if (listener === instance._startEventListener) {
      this.el.removeEventListener(this.eventName, listener, false);
    }
  }

  for (const eventName in el[EVENT_LISTENER_LIST]) {
    el[EVENT_LISTENER_LIST][eventName].forEach(rm, {eventName: eventName, el: el});
  }

  el[EVENT_LISTENER_LIST] = {};
  /* jshint ignore:end */
};

/**
 * Range feature detection
 * @return {Boolean}
 */
export const supportsRange = () => {
  const input = document.createElement('input');

  input.setAttribute('type', 'range');
  return input.type !== 'text';
};
