(function (factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    }
    else if (typeof exports === 'object') {
        // CommonJS
        factory();
    } else {
        // Browser globals
        /* jshint ignore:start */
        window['rangeSlider'] = factory();
        /* jshint ignore:end */
    }
}(function () {
        'use strict';

        var EVENT_LISTENER_LIST = 'eventListenerList';

        /**
         * Range feature detection
         * @return {Boolean}
         */
        function supportsRange() {
            var input = document.createElement('input');
            input.setAttribute('type', 'range');
            return input.type !== 'text';
        }

        var pluginName = 'rangeSlider',
            pluginIdentifier = 0,
            inputrange = supportsRange(),
            defaults = {
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
                borderRadius: 10
            };

        /**
         * Delays a function for the given number of milliseconds, and then calls
         * it with the arguments supplied.
         *
         * @param  {Function} fn   [description]
         * @param  {Number}   wait [description]
         * @return {Function}
         */
        function delay(fn, wait) {
            var args = Array.prototype.slice.call(arguments, 2);
            return setTimeout(function () {
                return fn.apply(null, args);
            }, wait);
        }

        /**
         * Returns a debounced function that will make sure the given
         * function is not triggered too much.
         *
         * @param  {Function} fn Function to debounce.
         * @param  {Number}   debounceDuration OPTIONAL. The amount of time in milliseconds for which we will debounce the function. (defaults to 100ms)
         * @return {Function}
         */
        function debounce(fn, debounceDuration) {
            debounceDuration = debounceDuration || 100;
            return function () {
                if (!fn.debouncing) {
                    var args = Array.prototype.slice.apply(arguments);
                    fn.lastReturnVal = fn.apply(window, args);
                    fn.debouncing = true;
                }
                clearTimeout(fn.debounceTimeout);
                fn.debounceTimeout = setTimeout(function () {
                    fn.debouncing = false;
                }, debounceDuration);
                return fn.lastReturnVal;
            };
        }

        /**
         * Check if a `element` is visible in the DOM
         *
         * @param  {Element}  element
         * @return {Boolean}
         */
        function isHidden(element) {
            return !!(element.offsetWidth === 0 || element.offsetHeight === 0 || element.open === false);

        }

        /**
         * Get hidden parentNodes of an `element`
         *
         * @param  {Element} element
         * @return {[type]}
         */
        function getHiddenParentNodes(element) {
            var parents = [],
                node = element.parentNode;

            while (isHidden(node)) {
                parents.push(node);
                node = node.parentNode;
            }
            return parents;
        }

        /**
         * Returns dimensions for an element even if it is not visible in the DOM.
         *
         * @param  {Element} element
         * @param  {string}  key     (e.g. offsetWidth …)
         * @return {Number}
         */
        function getDimension(element, key) {
            var hiddenParentNodes = getHiddenParentNodes(element),
                hiddenParentNodesLength = hiddenParentNodes.length,
                displayProperty = [],
                dimension = element[key];

            // Used for native `<details>` elements
            function toggleOpenProperty(element) {
                if (typeof element.open !== 'undefined') {
                    element.open = (element.open) ? false : true;
                }
            }

            if (hiddenParentNodesLength) {
                for (var i = 0; i < hiddenParentNodesLength; i++) {
                    // Cache the display property to restore it later.
                    displayProperty[i] = hiddenParentNodes[i].style.display;

                    hiddenParentNodes[i].style.display = 'block';
                    hiddenParentNodes[i].style.height = '0';
                    hiddenParentNodes[i].style.overflow = 'hidden';
                    hiddenParentNodes[i].style.visibility = 'hidden';
                    toggleOpenProperty(hiddenParentNodes[i]);
                }

                dimension = element[key];

                for (var j = 0; j < hiddenParentNodesLength; j++) {
                    toggleOpenProperty(hiddenParentNodes[j]);
                    hiddenParentNodes[j].style.display = displayProperty[j];
                    hiddenParentNodes[j].style.height = '';
                    hiddenParentNodes[j].style.overflow = '';
                    hiddenParentNodes[j].style.visibility = '';
                }
            }
            return dimension;
        }

        function isString(obj) {
            return obj === '' + obj;
        }

        function simpleExtend(defaultOpt, options) {
            var opt = {}, key;
            for (key in defaultOpt) {
                opt[key] = defaultOpt[key];
            }
            for (key in options) {
                opt[key] = options[key];
            }

            return opt;
        }

        /**
         *
         * @param {HTMLElement} el
         * @param {Object} cssObj
         * @returns {*}
         */
        function setCss(el, cssObj) {
            for (var key in cssObj) {
                el.style[key] = cssObj[key];
            }
            return el.style;
        }

        /**
         *
         * @param {HTMLElement} elem
         * @param {string} className
         */
        function addClass(elem, className) {
            if (!hasClass(elem, className)) {
                elem.className += ' ' + className;
            }
        }

        /**
         *
         * @param {HTMLElement} elem
         * @param {string} className
         */
        function removeClass(elem, className) {
            var newClass = ' ' + elem.className.replace(/[\t\r\n]/g, ' ') + ' ';
            if (hasClass(elem, className)) {
                while (newClass.indexOf(' ' + className + ' ') >= 0) {
                    newClass = newClass.replace(' ' + className + ' ', ' ');
                }
                elem.className = newClass.replace(/^\s+|\s+$/g, '');
            }
        }

        /**
         *
         * @callback fn
         * @param {Object} ctx
         */
        function proxy(fn, ctx) {
            return function () {
                fn.apply(ctx, arguments);
            };
        }

        /**
         *
         * @param {HTMLElement} el
         * @callback callback
         * @param {boolean} andForElement - apply callback for el
         * @returns {HTMLElement}
         */
        function forEachAncestors(el, callback, andForElement) {
            if (andForElement) {
                callback(el);
            }

            while (el.parentNode && !callback(el)) {
                el = el.parentNode;
            }

            return el;
        }

        /**
         *
         * @param {HTMLElement} el
         * @param {string} name event name
         * @param {Object} data
         */
        function triggerEvent(el, name, data) {
            if (!isString(name)) {
                throw new TypeError('event name must be String');
            }
            if (!el instanceof HTMLElement) {
                throw new TypeError('element must be HTMLElement');
            }
            name = name.trim();
            var event = new CustomEvent(name, data);
            el.dispatchEvent(event);
        }

        /**
         *
         * @param {HTMLElement} elem
         * @param {string} className
         */
        function hasClass(elem, className) {
            return new RegExp(' ' + className + ' ').test(' ' + elem.className + ' ');
        }

        /**
         * @param {Object} referenceNode after this
         * @param {Object} newNode insert this
         */
        function insertAfter(referenceNode, newNode) {
            referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
        }

        /**
         * Add event listeners and push them to el[EVENT_LISTENER_LIST]
         * @param {HTMLElement} el DOM element
         * @param {Array} events
         * @callback listener
         */
        function addEventListeners(el, events, listener) {
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
                    false
                );
                if (el[EVENT_LISTENER_LIST][eventName].indexOf(listener) < 0) {
                    el[EVENT_LISTENER_LIST][eventName].push(listener);
                }
            });
        }

        /**
         * Remove event listeners and remove them from el[EVENT_LISTENER_LIST]
         * @param {HTMLElement} el DOM element
         * @param {Array} events
         * @callback listener
         */
        function removeEventListeners(el, events, listener) {
            events.forEach(function (eventName) {
                el.removeEventListener(
                    eventName,
                    listener,
                    false
                );

                var index;
                if (el[EVENT_LISTENER_LIST] && el[EVENT_LISTENER_LIST][eventName] &&
                    (index = el[EVENT_LISTENER_LIST][eventName].indexOf(listener)) > -1
                ) {
                    el[EVENT_LISTENER_LIST][eventName].splice(index, 1);
                }
            });
        }

        /**
         * Remove ALL event listeners which exists in el[EVENT_LISTENER_LIST]
         * @param {HTMLElement} el DOM element
         */
        function removeAllListenersFromEl(el) {
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
                this.el.removeEventListener(this.eventName, listener, false);
            }

            for (var eventName in el[EVENT_LISTENER_LIST]) {
                el[EVENT_LISTENER_LIST][eventName].forEach(rm, {eventName: eventName, el: el});
            }
            /* jshint ignore:end */

            el[EVENT_LISTENER_LIST] = {};
        }


        /**
         * Plugin
         * @param {HTMLElement} element
         * @param {this} options
         */
        function Plugin(element, options) {
            var minSetByDefault, maxSetByDefault, stepSetByDefault;
            this.element = element;
            this.options = simpleExtend(defaults, options);
            this.polyfill = this.options.polyfill;
            this.onInit = this.options.onInit;
            this.onSlide = this.options.onSlide;
            this.onSlideStart = this.options.onSlideStart;
            this.onSlideEnd = this.options.onSlideEnd;
            this.onSlideEventsCount = -1;

            // Plugin should only be used as a polyfill
            if (!this.polyfill) {
                // Input range support?
                if (inputrange) {
                    return false;
                }
            }

            this.options.buffer = this.options.buffer || parseFloat(this.element.dataset.buffer);

            this.identifier = 'js-' + pluginName + '-' + (pluginIdentifier++);
            this.min = this.options.min || parseFloat(this.element.getAttribute('min') || (minSetByDefault = 0));
            this.max = this.options.max || parseFloat(this.element.getAttribute('max') || (maxSetByDefault = 100));
            this.value = this.options.value || parseFloat(this.element.value || this.min + (this.max - this.min) / 2);
            this.step = this.options.step || parseFloat(this.element.getAttribute('step') || (stepSetByDefault = 1));
            this.toFixed = (this.step + '').replace('.', '').length - 1;

            this.fill = document.createElement('div');
            this.fill.className = this.options.fillClass;

            this.handle = document.createElement('div');
            this.handle.className = this.options.handleClass;

            this.range = document.createElement('div');
            this.range.className = this.options.rangeClass;
            this.range.id = this.identifier;
            this.range.appendChild(this.handle);
            this.range.appendChild(this.fill);


            if (this.options.bufferClass) {
                this.buffer = document.createElement('div');
                this.buffer.className = this.options.bufferClass;
                this.range.appendChild(this.buffer);
            }

            if (this.options.value) {
                this.element.value = this.options.value;
            }

            if (this.options.buffer) {
                this.element.dataset.buffer = this.options.buffer;
            }

            if (this.options.min || minSetByDefault) {
                this.element.setAttribute('min', '' + this.options.min);
            }

            if (this.options.max || maxSetByDefault) {
                this.element.setAttribute('max', '' + this.options.max);
            }

            if (this.options.step || stepSetByDefault) {
                this.element.setAttribute('step', '' + this.options.step);
            }

            insertAfter(this.element, this.range);

            // visually hide the input
            setCss(this.element, {
                'position': 'absolute',
                'width': '1px',
                'height': '1px',
                'overflow': 'hidden',
                'opacity': '0'
            });

            // Store context
            this.handleDown = proxy(this.handleDown, this);
            this.handleMove = proxy(this.handleMove, this);
            this.handleEnd = proxy(this.handleEnd, this);
            this.startEventListener = proxy(this.startEventListener, this);
            this.changeEventListener = proxy(this.changeEventListener, this);
            this.handleResize = proxy(this.handleResize, this);

            this.init();

            //// Attach Events
            window.addEventListener('resize', this.handleResize, false);

            addEventListeners(document, this.options.startEvent, this.startEventListener);

            // Listen to programmatic value changes
            this.element.addEventListener('change', this.changeEventListener, false);
        }

        Plugin.prototype.constructor = Plugin;


        Plugin.prototype.init = function () {
            if (this.onInit && typeof this.onInit === 'function') {
                this.onInit();
            }
            this.update();
        };

        /**
         * This method check if this.identifier exists in ev.target's ancestors
         * @param ev
         * @param data
         */
        Plugin.prototype.startEventListener = function (ev, data) {
            var _this = this;
            var el = ev.target;
            var isEventOnSlider = false;
            forEachAncestors(el, function (el) {
                return (isEventOnSlider = el.id === _this.identifier && !hasClass(el, _this.options.disabledClass));
            }, true);
            if (isEventOnSlider) {
                this.handleDown(ev, data);
            }
        };

        Plugin.prototype.changeEventListener = function (ev, data) {
            if (data && data.origin === this.identifier) {
                return;
            }

            var value = ev.target.value,
                pos = this.getPositionFromValue(value);
            this.setPosition(pos);
        };

        Plugin.prototype.update = function () {
            this.handleWidth = getDimension(this.handle, 'offsetWidth');
            this.rangeWidth = getDimension(this.range, 'offsetWidth');
            this.maxHandleX = this.rangeWidth - this.handleWidth;
            this.grabX = this.handleWidth / 2;
            this.position = this.getPositionFromValue(this.value);

            // Consider disabled state
            if (this.element.disabled) {
                addClass(this.range, this.options.disabledClass);
            } else {
                removeClass(this.range, this.options.disabledClass);
            }

            this.setPosition(this.position);
            if (this.options.bufferClass && this.options.buffer) {
                this.setBufferPosition(this.options.buffer, true);
            }
        };

        Plugin.prototype.handleResize = function () {
            var _this = this;
            return debounce(function () {
                // Simulate resizeEnd event.
                delay(function () {
                    _this.update();
                }, 300);
            }, 20)();
        };

        Plugin.prototype.handleDown = function (e) {
            e.preventDefault();
            addEventListeners(document, this.options.moveEvent, this.handleMove);
            addEventListeners(document, this.options.endEvent, this.handleEnd);

            // If we click on the handle don't set the new position
            if ((' ' + e.target.className + ' ').replace(/[\n\t]/g, ' ').indexOf(this.options.handleClass) > -1) {
                return;
            }

            var posX = this.getRelativePosition(e),
                rangeX = this.range.getBoundingClientRect().left,
                handleX = this.getPositionFromNode(this.handle) - rangeX;

            this.setPosition(posX - this.grabX);

            if (posX >= handleX && posX < handleX + this.handleWidth) {
                this.grabX = posX - handleX;
            }
        };

        Plugin.prototype.handleMove = function (e) {
            e.preventDefault();
            var posX = this.getRelativePosition(e);
            this.setPosition(posX - this.grabX);
        };

        Plugin.prototype.handleEnd = function (e) {
            e.preventDefault();
            removeEventListeners(document, this.options.moveEvent, this.handleMove);
            removeEventListeners(document, this.options.endEvent, this.handleEnd);

            // Ok we're done fire the change event
            triggerEvent(this.element, 'change', {origin: this.identifier});

            if (this.onSlideEnd && typeof this.onSlideEnd === 'function') {
                this.onSlideEnd(this.position, this.value);
            }
            this.onSlideEventsCount = 0;
        };

        Plugin.prototype.cap = function (pos, min, max) {
            if (pos < min) {
                return min;
            }
            if (pos > max) {
                return max;
            }
            return pos;
        };

        Plugin.prototype.setPosition = function (pos) {
            var value, left;

            // Snapping steps
            value = this.getValueFromPosition(this.cap(pos, 0, this.maxHandleX));
            left = this.getPositionFromValue(value);

            // Update ui
            this.fill.style.width = (left + this.grabX) + 'px';
            this.handle.style.left = left + 'px';
            this.setValue(value);

            // Update globals
            this.position = left;
            this.value = value;

            if (this.onSlide && typeof this.onSlide === 'function') {
                this.onSlide(left, value);
            }
            if (this.onSlideStart && typeof this.onSlideStart === 'function' && this.onSlideEventsCount === 0) {
                this.onSlideStart(left, value);
            }

            this.onSlideEventsCount++;
        };

        Plugin.prototype.setBufferPosition = function (pos, isPercent) {
            pos = parseFloat(pos);
            if (isNaN(pos)) {
                console.warn('New position is NaN');
                return this;
            }
            if (!this.options.bufferClass) {
                console.warn('You disabled buffer, it\'s className is empty');
                return this;
            }
            var bufferWidth = isPercent ? pos : (pos / this.rangeWidth * 100);
            if (bufferWidth < 0) {
                bufferWidth = 0;
            }
            if (bufferWidth > 100) {
                bufferWidth = 100;
            }
            this.options.buffer = bufferWidth;

            var paddingWidth = this.options.borderRadius / this.rangeWidth * 100;
            var bufferWidhWithPadding = bufferWidth - paddingWidth;
            if (bufferWidhWithPadding < 0) {
                bufferWidhWithPadding = 0;
            }

            this.buffer.style.width = bufferWidhWithPadding + '%';
            this.buffer.style.left = paddingWidth * 0.5 + '%';

        };

        // Returns element position relative to the parent
        Plugin.prototype.getPositionFromNode = function (node) {
            var i = 0;
            while (node !== null) {
                i += node.offsetLeft;
                node = node.offsetParent;
            }
            return i;
        };

        /**
         *
         * @param {(MouseEvent|TouchEvent)}e
         * @returns {number}
         */
        Plugin.prototype.getRelativePosition = function (e) {
            // Get the offset left relative to the viewport
            var rangeX = this.range.getBoundingClientRect().left,
                pageX = 0;

            if (typeof e.pageX !== 'undefined') {
                pageX = (e.touches && e.touches.length) ? e.touches[0].pageX : e.pageX;
            }
            else if (typeof e.originalEvent.clientX !== 'undefined') {
                pageX = e.originalEvent.clientX;
            }
            else if (e.originalEvent.touches && e.originalEvent.touches[0] && typeof e.originalEvent.touches[0].clientX !== 'undefined') {
                pageX = e.originalEvent.touches[0].clientX;
            }
            else if (e.currentPoint && typeof e.currentPoint.x !== 'undefined') {
                pageX = e.currentPoint.x;
            }

            return pageX - rangeX;
        };

        Plugin.prototype.getPositionFromValue = function (value) {
            var percentage, pos;
            percentage = (value - this.min) / (this.max - this.min);
            pos = percentage * this.maxHandleX;
            return pos;
        };

        Plugin.prototype.getValueFromPosition = function (pos) {
            var percentage, value;
            percentage = ((pos) / (this.maxHandleX || 1));
            value = this.step * Math.round(percentage * (this.max - this.min) / this.step) + this.min;
            return Number((value).toFixed(this.toFixed));
        };

        Plugin.prototype.setValue = function (value) {
            if (value === this.value) {
                return;
            }

            // Set the new value and fire the `input` event
            this.element.value = value;
            triggerEvent(this.element, 'input', {origin: this.identifier});
        };

        Plugin.prototype.destroy = function () {
            removeAllListenersFromEl(document);
            window.removeEventListener('resize', this.handleResize, false);
            this.element.removeEventListener('change', this.changeEventListener, false);

            this.element.style.cssText = '';
            delete this.element[pluginName];

            // Remove the generated markup
            if (this.range) {
                this.range.parentNode.removeChild(this.range);
            }
        };

        // A really lightweight plugin wrapper around the constructor,
        // preventing against multiple instantiations

        Plugin.create = function (el, options) {
            function createInstance(el) {
                var data = el[pluginName];

                // Create a new instance.
                if (!data) {
                    data = new Plugin(el, options);
                    el[pluginName] = data;
                }
            }

            if (el.length) {
                Array.prototype.slice.call(el).forEach(function (el) {
                    createInstance(el);
                });
            } else {
                createInstance(el);
            }
        };

        return Plugin;

    }
));
