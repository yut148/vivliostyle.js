(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*!
 * Knockout JavaScript library v3.4.0
 * (c) Steven Sanderson - http://knockoutjs.com/
 * License: MIT (http://www.opensource.org/licenses/mit-license.php)
 */

(function(){
var DEBUG=true;
(function(undefined){
    // (0, eval)('this') is a robust way of getting a reference to the global object
    // For details, see http://stackoverflow.com/questions/14119988/return-this-0-evalthis/14120023#14120023
    var window = this || (0, eval)('this'),
        document = window['document'],
        navigator = window['navigator'],
        jQueryInstance = window["jQuery"],
        JSON = window["JSON"];
(function(factory) {
    // Support three module loading scenarios
    if (typeof define === 'function' && define['amd']) {
        // [1] AMD anonymous module
        define(['exports', 'require'], factory);
    } else if (typeof exports === 'object' && typeof module === 'object') {
        // [2] CommonJS/Node.js
        factory(module['exports'] || exports);  // module.exports is for Node.js
    } else {
        // [3] No module loader (plain <script> tag) - put directly in global namespace
        factory(window['ko'] = {});
    }
}(function(koExports, amdRequire){
// Internally, all KO objects are attached to koExports (even the non-exported ones whose names will be minified by the closure compiler).
// In the future, the following "ko" variable may be made distinct from "koExports" so that private objects are not externally reachable.
var ko = typeof koExports !== 'undefined' ? koExports : {};
// Google Closure Compiler helpers (used only to make the minified file smaller)
ko.exportSymbol = function(koPath, object) {
    var tokens = koPath.split(".");

    // In the future, "ko" may become distinct from "koExports" (so that non-exported objects are not reachable)
    // At that point, "target" would be set to: (typeof koExports !== "undefined" ? koExports : ko)
    var target = ko;

    for (var i = 0; i < tokens.length - 1; i++)
        target = target[tokens[i]];
    target[tokens[tokens.length - 1]] = object;
};
ko.exportProperty = function(owner, publicName, object) {
    owner[publicName] = object;
};
ko.version = "3.4.0";

ko.exportSymbol('version', ko.version);
// For any options that may affect various areas of Knockout and aren't directly associated with data binding.
ko.options = {
    'deferUpdates': false,
    'useOnlyNativeEvents': false
};

//ko.exportSymbol('options', ko.options);   // 'options' isn't minified
ko.utils = (function () {
    function objectForEach(obj, action) {
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                action(prop, obj[prop]);
            }
        }
    }

    function extend(target, source) {
        if (source) {
            for(var prop in source) {
                if(source.hasOwnProperty(prop)) {
                    target[prop] = source[prop];
                }
            }
        }
        return target;
    }

    function setPrototypeOf(obj, proto) {
        obj.__proto__ = proto;
        return obj;
    }

    var canSetPrototype = ({ __proto__: [] } instanceof Array);
    var canUseSymbols = !DEBUG && typeof Symbol === 'function';

    // Represent the known event types in a compact way, then at runtime transform it into a hash with event name as key (for fast lookup)
    var knownEvents = {}, knownEventTypesByEventName = {};
    var keyEventTypeName = (navigator && /Firefox\/2/i.test(navigator.userAgent)) ? 'KeyboardEvent' : 'UIEvents';
    knownEvents[keyEventTypeName] = ['keyup', 'keydown', 'keypress'];
    knownEvents['MouseEvents'] = ['click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout', 'mouseenter', 'mouseleave'];
    objectForEach(knownEvents, function(eventType, knownEventsForType) {
        if (knownEventsForType.length) {
            for (var i = 0, j = knownEventsForType.length; i < j; i++)
                knownEventTypesByEventName[knownEventsForType[i]] = eventType;
        }
    });
    var eventsThatMustBeRegisteredUsingAttachEvent = { 'propertychange': true }; // Workaround for an IE9 issue - https://github.com/SteveSanderson/knockout/issues/406

    // Detect IE versions for bug workarounds (uses IE conditionals, not UA string, for robustness)
    // Note that, since IE 10 does not support conditional comments, the following logic only detects IE < 10.
    // Currently this is by design, since IE 10+ behaves correctly when treated as a standard browser.
    // If there is a future need to detect specific versions of IE10+, we will amend this.
    var ieVersion = document && (function() {
        var version = 3, div = document.createElement('div'), iElems = div.getElementsByTagName('i');

        // Keep constructing conditional HTML blocks until we hit one that resolves to an empty fragment
        while (
            div.innerHTML = '<!--[if gt IE ' + (++version) + ']><i></i><![endif]-->',
            iElems[0]
        ) {}
        return version > 4 ? version : undefined;
    }());
    var isIe6 = ieVersion === 6,
        isIe7 = ieVersion === 7;

    function isClickOnCheckableElement(element, eventType) {
        if ((ko.utils.tagNameLower(element) !== "input") || !element.type) return false;
        if (eventType.toLowerCase() != "click") return false;
        var inputType = element.type;
        return (inputType == "checkbox") || (inputType == "radio");
    }

    // For details on the pattern for changing node classes
    // see: https://github.com/knockout/knockout/issues/1597
    var cssClassNameRegex = /\S+/g;

    function toggleDomNodeCssClass(node, classNames, shouldHaveClass) {
        var addOrRemoveFn;
        if (classNames) {
            if (typeof node.classList === 'object') {
                addOrRemoveFn = node.classList[shouldHaveClass ? 'add' : 'remove'];
                ko.utils.arrayForEach(classNames.match(cssClassNameRegex), function(className) {
                    addOrRemoveFn.call(node.classList, className);
                });
            } else if (typeof node.className['baseVal'] === 'string') {
                // SVG tag .classNames is an SVGAnimatedString instance
                toggleObjectClassPropertyString(node.className, 'baseVal', classNames, shouldHaveClass);
            } else {
                // node.className ought to be a string.
                toggleObjectClassPropertyString(node, 'className', classNames, shouldHaveClass);
            }
        }
    }

    function toggleObjectClassPropertyString(obj, prop, classNames, shouldHaveClass) {
        // obj/prop is either a node/'className' or a SVGAnimatedString/'baseVal'.
        var currentClassNames = obj[prop].match(cssClassNameRegex) || [];
        ko.utils.arrayForEach(classNames.match(cssClassNameRegex), function(className) {
            ko.utils.addOrRemoveItem(currentClassNames, className, shouldHaveClass);
        });
        obj[prop] = currentClassNames.join(" ");
    }

    return {
        fieldsIncludedWithJsonPost: ['authenticity_token', /^__RequestVerificationToken(_.*)?$/],

        arrayForEach: function (array, action) {
            for (var i = 0, j = array.length; i < j; i++)
                action(array[i], i);
        },

        arrayIndexOf: function (array, item) {
            if (typeof Array.prototype.indexOf == "function")
                return Array.prototype.indexOf.call(array, item);
            for (var i = 0, j = array.length; i < j; i++)
                if (array[i] === item)
                    return i;
            return -1;
        },

        arrayFirst: function (array, predicate, predicateOwner) {
            for (var i = 0, j = array.length; i < j; i++)
                if (predicate.call(predicateOwner, array[i], i))
                    return array[i];
            return null;
        },

        arrayRemoveItem: function (array, itemToRemove) {
            var index = ko.utils.arrayIndexOf(array, itemToRemove);
            if (index > 0) {
                array.splice(index, 1);
            }
            else if (index === 0) {
                array.shift();
            }
        },

        arrayGetDistinctValues: function (array) {
            array = array || [];
            var result = [];
            for (var i = 0, j = array.length; i < j; i++) {
                if (ko.utils.arrayIndexOf(result, array[i]) < 0)
                    result.push(array[i]);
            }
            return result;
        },

        arrayMap: function (array, mapping) {
            array = array || [];
            var result = [];
            for (var i = 0, j = array.length; i < j; i++)
                result.push(mapping(array[i], i));
            return result;
        },

        arrayFilter: function (array, predicate) {
            array = array || [];
            var result = [];
            for (var i = 0, j = array.length; i < j; i++)
                if (predicate(array[i], i))
                    result.push(array[i]);
            return result;
        },

        arrayPushAll: function (array, valuesToPush) {
            if (valuesToPush instanceof Array)
                array.push.apply(array, valuesToPush);
            else
                for (var i = 0, j = valuesToPush.length; i < j; i++)
                    array.push(valuesToPush[i]);
            return array;
        },

        addOrRemoveItem: function(array, value, included) {
            var existingEntryIndex = ko.utils.arrayIndexOf(ko.utils.peekObservable(array), value);
            if (existingEntryIndex < 0) {
                if (included)
                    array.push(value);
            } else {
                if (!included)
                    array.splice(existingEntryIndex, 1);
            }
        },

        canSetPrototype: canSetPrototype,

        extend: extend,

        setPrototypeOf: setPrototypeOf,

        setPrototypeOfOrExtend: canSetPrototype ? setPrototypeOf : extend,

        objectForEach: objectForEach,

        objectMap: function(source, mapping) {
            if (!source)
                return source;
            var target = {};
            for (var prop in source) {
                if (source.hasOwnProperty(prop)) {
                    target[prop] = mapping(source[prop], prop, source);
                }
            }
            return target;
        },

        emptyDomNode: function (domNode) {
            while (domNode.firstChild) {
                ko.removeNode(domNode.firstChild);
            }
        },

        moveCleanedNodesToContainerElement: function(nodes) {
            // Ensure it's a real array, as we're about to reparent the nodes and
            // we don't want the underlying collection to change while we're doing that.
            var nodesArray = ko.utils.makeArray(nodes);
            var templateDocument = (nodesArray[0] && nodesArray[0].ownerDocument) || document;

            var container = templateDocument.createElement('div');
            for (var i = 0, j = nodesArray.length; i < j; i++) {
                container.appendChild(ko.cleanNode(nodesArray[i]));
            }
            return container;
        },

        cloneNodes: function (nodesArray, shouldCleanNodes) {
            for (var i = 0, j = nodesArray.length, newNodesArray = []; i < j; i++) {
                var clonedNode = nodesArray[i].cloneNode(true);
                newNodesArray.push(shouldCleanNodes ? ko.cleanNode(clonedNode) : clonedNode);
            }
            return newNodesArray;
        },

        setDomNodeChildren: function (domNode, childNodes) {
            ko.utils.emptyDomNode(domNode);
            if (childNodes) {
                for (var i = 0, j = childNodes.length; i < j; i++)
                    domNode.appendChild(childNodes[i]);
            }
        },

        replaceDomNodes: function (nodeToReplaceOrNodeArray, newNodesArray) {
            var nodesToReplaceArray = nodeToReplaceOrNodeArray.nodeType ? [nodeToReplaceOrNodeArray] : nodeToReplaceOrNodeArray;
            if (nodesToReplaceArray.length > 0) {
                var insertionPoint = nodesToReplaceArray[0];
                var parent = insertionPoint.parentNode;
                for (var i = 0, j = newNodesArray.length; i < j; i++)
                    parent.insertBefore(newNodesArray[i], insertionPoint);
                for (var i = 0, j = nodesToReplaceArray.length; i < j; i++) {
                    ko.removeNode(nodesToReplaceArray[i]);
                }
            }
        },

        fixUpContinuousNodeArray: function(continuousNodeArray, parentNode) {
            // Before acting on a set of nodes that were previously outputted by a template function, we have to reconcile
            // them against what is in the DOM right now. It may be that some of the nodes have already been removed, or that
            // new nodes might have been inserted in the middle, for example by a binding. Also, there may previously have been
            // leading comment nodes (created by rewritten string-based templates) that have since been removed during binding.
            // So, this function translates the old "map" output array into its best guess of the set of current DOM nodes.
            //
            // Rules:
            //   [A] Any leading nodes that have been removed should be ignored
            //       These most likely correspond to memoization nodes that were already removed during binding
            //       See https://github.com/knockout/knockout/pull/440
            //   [B] Any trailing nodes that have been remove should be ignored
            //       This prevents the code here from adding unrelated nodes to the array while processing rule [C]
            //       See https://github.com/knockout/knockout/pull/1903
            //   [C] We want to output a continuous series of nodes. So, ignore any nodes that have already been removed,
            //       and include any nodes that have been inserted among the previous collection

            if (continuousNodeArray.length) {
                // The parent node can be a virtual element; so get the real parent node
                parentNode = (parentNode.nodeType === 8 && parentNode.parentNode) || parentNode;

                // Rule [A]
                while (continuousNodeArray.length && continuousNodeArray[0].parentNode !== parentNode)
                    continuousNodeArray.splice(0, 1);

                // Rule [B]
                while (continuousNodeArray.length > 1 && continuousNodeArray[continuousNodeArray.length - 1].parentNode !== parentNode)
                    continuousNodeArray.length--;

                // Rule [C]
                if (continuousNodeArray.length > 1) {
                    var current = continuousNodeArray[0], last = continuousNodeArray[continuousNodeArray.length - 1];
                    // Replace with the actual new continuous node set
                    continuousNodeArray.length = 0;
                    while (current !== last) {
                        continuousNodeArray.push(current);
                        current = current.nextSibling;
                    }
                    continuousNodeArray.push(last);
                }
            }
            return continuousNodeArray;
        },

        setOptionNodeSelectionState: function (optionNode, isSelected) {
            // IE6 sometimes throws "unknown error" if you try to write to .selected directly, whereas Firefox struggles with setAttribute. Pick one based on browser.
            if (ieVersion < 7)
                optionNode.setAttribute("selected", isSelected);
            else
                optionNode.selected = isSelected;
        },

        stringTrim: function (string) {
            return string === null || string === undefined ? '' :
                string.trim ?
                    string.trim() :
                    string.toString().replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
        },

        stringStartsWith: function (string, startsWith) {
            string = string || "";
            if (startsWith.length > string.length)
                return false;
            return string.substring(0, startsWith.length) === startsWith;
        },

        domNodeIsContainedBy: function (node, containedByNode) {
            if (node === containedByNode)
                return true;
            if (node.nodeType === 11)
                return false; // Fixes issue #1162 - can't use node.contains for document fragments on IE8
            if (containedByNode.contains)
                return containedByNode.contains(node.nodeType === 3 ? node.parentNode : node);
            if (containedByNode.compareDocumentPosition)
                return (containedByNode.compareDocumentPosition(node) & 16) == 16;
            while (node && node != containedByNode) {
                node = node.parentNode;
            }
            return !!node;
        },

        domNodeIsAttachedToDocument: function (node) {
            return ko.utils.domNodeIsContainedBy(node, node.ownerDocument.documentElement);
        },

        anyDomNodeIsAttachedToDocument: function(nodes) {
            return !!ko.utils.arrayFirst(nodes, ko.utils.domNodeIsAttachedToDocument);
        },

        tagNameLower: function(element) {
            // For HTML elements, tagName will always be upper case; for XHTML elements, it'll be lower case.
            // Possible future optimization: If we know it's an element from an XHTML document (not HTML),
            // we don't need to do the .toLowerCase() as it will always be lower case anyway.
            return element && element.tagName && element.tagName.toLowerCase();
        },

        catchFunctionErrors: function (delegate) {
            return ko['onError'] ? function () {
                try {
                    return delegate.apply(this, arguments);
                } catch (e) {
                    ko['onError'] && ko['onError'](e);
                    throw e;
                }
            } : delegate;
        },

        setTimeout: function (handler, timeout) {
            return setTimeout(ko.utils.catchFunctionErrors(handler), timeout);
        },

        deferError: function (error) {
            setTimeout(function () {
                ko['onError'] && ko['onError'](error);
                throw error;
            }, 0);
        },

        registerEventHandler: function (element, eventType, handler) {
            var wrappedHandler = ko.utils.catchFunctionErrors(handler);

            var mustUseAttachEvent = ieVersion && eventsThatMustBeRegisteredUsingAttachEvent[eventType];
            if (!ko.options['useOnlyNativeEvents'] && !mustUseAttachEvent && jQueryInstance) {
                jQueryInstance(element)['bind'](eventType, wrappedHandler);
            } else if (!mustUseAttachEvent && typeof element.addEventListener == "function")
                element.addEventListener(eventType, wrappedHandler, false);
            else if (typeof element.attachEvent != "undefined") {
                var attachEventHandler = function (event) { wrappedHandler.call(element, event); },
                    attachEventName = "on" + eventType;
                element.attachEvent(attachEventName, attachEventHandler);

                // IE does not dispose attachEvent handlers automatically (unlike with addEventListener)
                // so to avoid leaks, we have to remove them manually. See bug #856
                ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                    element.detachEvent(attachEventName, attachEventHandler);
                });
            } else
                throw new Error("Browser doesn't support addEventListener or attachEvent");
        },

        triggerEvent: function (element, eventType) {
            if (!(element && element.nodeType))
                throw new Error("element must be a DOM node when calling triggerEvent");

            // For click events on checkboxes and radio buttons, jQuery toggles the element checked state *after* the
            // event handler runs instead of *before*. (This was fixed in 1.9 for checkboxes but not for radio buttons.)
            // IE doesn't change the checked state when you trigger the click event using "fireEvent".
            // In both cases, we'll use the click method instead.
            var useClickWorkaround = isClickOnCheckableElement(element, eventType);

            if (!ko.options['useOnlyNativeEvents'] && jQueryInstance && !useClickWorkaround) {
                jQueryInstance(element)['trigger'](eventType);
            } else if (typeof document.createEvent == "function") {
                if (typeof element.dispatchEvent == "function") {
                    var eventCategory = knownEventTypesByEventName[eventType] || "HTMLEvents";
                    var event = document.createEvent(eventCategory);
                    event.initEvent(eventType, true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, element);
                    element.dispatchEvent(event);
                }
                else
                    throw new Error("The supplied element doesn't support dispatchEvent");
            } else if (useClickWorkaround && element.click) {
                element.click();
            } else if (typeof element.fireEvent != "undefined") {
                element.fireEvent("on" + eventType);
            } else {
                throw new Error("Browser doesn't support triggering events");
            }
        },

        unwrapObservable: function (value) {
            return ko.isObservable(value) ? value() : value;
        },

        peekObservable: function (value) {
            return ko.isObservable(value) ? value.peek() : value;
        },

        toggleDomNodeCssClass: toggleDomNodeCssClass,

        setTextContent: function(element, textContent) {
            var value = ko.utils.unwrapObservable(textContent);
            if ((value === null) || (value === undefined))
                value = "";

            // We need there to be exactly one child: a text node.
            // If there are no children, more than one, or if it's not a text node,
            // we'll clear everything and create a single text node.
            var innerTextNode = ko.virtualElements.firstChild(element);
            if (!innerTextNode || innerTextNode.nodeType != 3 || ko.virtualElements.nextSibling(innerTextNode)) {
                ko.virtualElements.setDomNodeChildren(element, [element.ownerDocument.createTextNode(value)]);
            } else {
                innerTextNode.data = value;
            }

            ko.utils.forceRefresh(element);
        },

        setElementName: function(element, name) {
            element.name = name;

            // Workaround IE 6/7 issue
            // - https://github.com/SteveSanderson/knockout/issues/197
            // - http://www.matts411.com/post/setting_the_name_attribute_in_ie_dom/
            if (ieVersion <= 7) {
                try {
                    element.mergeAttributes(document.createElement("<input name='" + element.name + "'/>"), false);
                }
                catch(e) {} // For IE9 with doc mode "IE9 Standards" and browser mode "IE9 Compatibility View"
            }
        },

        forceRefresh: function(node) {
            // Workaround for an IE9 rendering bug - https://github.com/SteveSanderson/knockout/issues/209
            if (ieVersion >= 9) {
                // For text nodes and comment nodes (most likely virtual elements), we will have to refresh the container
                var elem = node.nodeType == 1 ? node : node.parentNode;
                if (elem.style)
                    elem.style.zoom = elem.style.zoom;
            }
        },

        ensureSelectElementIsRenderedCorrectly: function(selectElement) {
            // Workaround for IE9 rendering bug - it doesn't reliably display all the text in dynamically-added select boxes unless you force it to re-render by updating the width.
            // (See https://github.com/SteveSanderson/knockout/issues/312, http://stackoverflow.com/questions/5908494/select-only-shows-first-char-of-selected-option)
            // Also fixes IE7 and IE8 bug that causes selects to be zero width if enclosed by 'if' or 'with'. (See issue #839)
            if (ieVersion) {
                var originalWidth = selectElement.style.width;
                selectElement.style.width = 0;
                selectElement.style.width = originalWidth;
            }
        },

        range: function (min, max) {
            min = ko.utils.unwrapObservable(min);
            max = ko.utils.unwrapObservable(max);
            var result = [];
            for (var i = min; i <= max; i++)
                result.push(i);
            return result;
        },

        makeArray: function(arrayLikeObject) {
            var result = [];
            for (var i = 0, j = arrayLikeObject.length; i < j; i++) {
                result.push(arrayLikeObject[i]);
            };
            return result;
        },

        createSymbolOrString: function(identifier) {
            return canUseSymbols ? Symbol(identifier) : identifier;
        },

        isIe6 : isIe6,
        isIe7 : isIe7,
        ieVersion : ieVersion,

        getFormFields: function(form, fieldName) {
            var fields = ko.utils.makeArray(form.getElementsByTagName("input")).concat(ko.utils.makeArray(form.getElementsByTagName("textarea")));
            var isMatchingField = (typeof fieldName == 'string')
                ? function(field) { return field.name === fieldName }
                : function(field) { return fieldName.test(field.name) }; // Treat fieldName as regex or object containing predicate
            var matches = [];
            for (var i = fields.length - 1; i >= 0; i--) {
                if (isMatchingField(fields[i]))
                    matches.push(fields[i]);
            };
            return matches;
        },

        parseJson: function (jsonString) {
            if (typeof jsonString == "string") {
                jsonString = ko.utils.stringTrim(jsonString);
                if (jsonString) {
                    if (JSON && JSON.parse) // Use native parsing where available
                        return JSON.parse(jsonString);
                    return (new Function("return " + jsonString))(); // Fallback on less safe parsing for older browsers
                }
            }
            return null;
        },

        stringifyJson: function (data, replacer, space) {   // replacer and space are optional
            if (!JSON || !JSON.stringify)
                throw new Error("Cannot find JSON.stringify(). Some browsers (e.g., IE < 8) don't support it natively, but you can overcome this by adding a script reference to json2.js, downloadable from http://www.json.org/json2.js");
            return JSON.stringify(ko.utils.unwrapObservable(data), replacer, space);
        },

        postJson: function (urlOrForm, data, options) {
            options = options || {};
            var params = options['params'] || {};
            var includeFields = options['includeFields'] || this.fieldsIncludedWithJsonPost;
            var url = urlOrForm;

            // If we were given a form, use its 'action' URL and pick out any requested field values
            if((typeof urlOrForm == 'object') && (ko.utils.tagNameLower(urlOrForm) === "form")) {
                var originalForm = urlOrForm;
                url = originalForm.action;
                for (var i = includeFields.length - 1; i >= 0; i--) {
                    var fields = ko.utils.getFormFields(originalForm, includeFields[i]);
                    for (var j = fields.length - 1; j >= 0; j--)
                        params[fields[j].name] = fields[j].value;
                }
            }

            data = ko.utils.unwrapObservable(data);
            var form = document.createElement("form");
            form.style.display = "none";
            form.action = url;
            form.method = "post";
            for (var key in data) {
                // Since 'data' this is a model object, we include all properties including those inherited from its prototype
                var input = document.createElement("input");
                input.type = "hidden";
                input.name = key;
                input.value = ko.utils.stringifyJson(ko.utils.unwrapObservable(data[key]));
                form.appendChild(input);
            }
            objectForEach(params, function(key, value) {
                var input = document.createElement("input");
                input.type = "hidden";
                input.name = key;
                input.value = value;
                form.appendChild(input);
            });
            document.body.appendChild(form);
            options['submitter'] ? options['submitter'](form) : form.submit();
            setTimeout(function () { form.parentNode.removeChild(form); }, 0);
        }
    }
}());

ko.exportSymbol('utils', ko.utils);
ko.exportSymbol('utils.arrayForEach', ko.utils.arrayForEach);
ko.exportSymbol('utils.arrayFirst', ko.utils.arrayFirst);
ko.exportSymbol('utils.arrayFilter', ko.utils.arrayFilter);
ko.exportSymbol('utils.arrayGetDistinctValues', ko.utils.arrayGetDistinctValues);
ko.exportSymbol('utils.arrayIndexOf', ko.utils.arrayIndexOf);
ko.exportSymbol('utils.arrayMap', ko.utils.arrayMap);
ko.exportSymbol('utils.arrayPushAll', ko.utils.arrayPushAll);
ko.exportSymbol('utils.arrayRemoveItem', ko.utils.arrayRemoveItem);
ko.exportSymbol('utils.extend', ko.utils.extend);
ko.exportSymbol('utils.fieldsIncludedWithJsonPost', ko.utils.fieldsIncludedWithJsonPost);
ko.exportSymbol('utils.getFormFields', ko.utils.getFormFields);
ko.exportSymbol('utils.peekObservable', ko.utils.peekObservable);
ko.exportSymbol('utils.postJson', ko.utils.postJson);
ko.exportSymbol('utils.parseJson', ko.utils.parseJson);
ko.exportSymbol('utils.registerEventHandler', ko.utils.registerEventHandler);
ko.exportSymbol('utils.stringifyJson', ko.utils.stringifyJson);
ko.exportSymbol('utils.range', ko.utils.range);
ko.exportSymbol('utils.toggleDomNodeCssClass', ko.utils.toggleDomNodeCssClass);
ko.exportSymbol('utils.triggerEvent', ko.utils.triggerEvent);
ko.exportSymbol('utils.unwrapObservable', ko.utils.unwrapObservable);
ko.exportSymbol('utils.objectForEach', ko.utils.objectForEach);
ko.exportSymbol('utils.addOrRemoveItem', ko.utils.addOrRemoveItem);
ko.exportSymbol('utils.setTextContent', ko.utils.setTextContent);
ko.exportSymbol('unwrap', ko.utils.unwrapObservable); // Convenient shorthand, because this is used so commonly

if (!Function.prototype['bind']) {
    // Function.prototype.bind is a standard part of ECMAScript 5th Edition (December 2009, http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-262.pdf)
    // In case the browser doesn't implement it natively, provide a JavaScript implementation. This implementation is based on the one in prototype.js
    Function.prototype['bind'] = function (object) {
        var originalFunction = this;
        if (arguments.length === 1) {
            return function () {
                return originalFunction.apply(object, arguments);
            };
        } else {
            var partialArgs = Array.prototype.slice.call(arguments, 1);
            return function () {
                var args = partialArgs.slice(0);
                args.push.apply(args, arguments);
                return originalFunction.apply(object, args);
            };
        }
    };
}

ko.utils.domData = new (function () {
    var uniqueId = 0;
    var dataStoreKeyExpandoPropertyName = "__ko__" + (new Date).getTime();
    var dataStore = {};

    function getAll(node, createIfNotFound) {
        var dataStoreKey = node[dataStoreKeyExpandoPropertyName];
        var hasExistingDataStore = dataStoreKey && (dataStoreKey !== "null") && dataStore[dataStoreKey];
        if (!hasExistingDataStore) {
            if (!createIfNotFound)
                return undefined;
            dataStoreKey = node[dataStoreKeyExpandoPropertyName] = "ko" + uniqueId++;
            dataStore[dataStoreKey] = {};
        }
        return dataStore[dataStoreKey];
    }

    return {
        get: function (node, key) {
            var allDataForNode = getAll(node, false);
            return allDataForNode === undefined ? undefined : allDataForNode[key];
        },
        set: function (node, key, value) {
            if (value === undefined) {
                // Make sure we don't actually create a new domData key if we are actually deleting a value
                if (getAll(node, false) === undefined)
                    return;
            }
            var allDataForNode = getAll(node, true);
            allDataForNode[key] = value;
        },
        clear: function (node) {
            var dataStoreKey = node[dataStoreKeyExpandoPropertyName];
            if (dataStoreKey) {
                delete dataStore[dataStoreKey];
                node[dataStoreKeyExpandoPropertyName] = null;
                return true; // Exposing "did clean" flag purely so specs can infer whether things have been cleaned up as intended
            }
            return false;
        },

        nextKey: function () {
            return (uniqueId++) + dataStoreKeyExpandoPropertyName;
        }
    };
})();

ko.exportSymbol('utils.domData', ko.utils.domData);
ko.exportSymbol('utils.domData.clear', ko.utils.domData.clear); // Exporting only so specs can clear up after themselves fully

ko.utils.domNodeDisposal = new (function () {
    var domDataKey = ko.utils.domData.nextKey();
    var cleanableNodeTypes = { 1: true, 8: true, 9: true };       // Element, Comment, Document
    var cleanableNodeTypesWithDescendants = { 1: true, 9: true }; // Element, Document

    function getDisposeCallbacksCollection(node, createIfNotFound) {
        var allDisposeCallbacks = ko.utils.domData.get(node, domDataKey);
        if ((allDisposeCallbacks === undefined) && createIfNotFound) {
            allDisposeCallbacks = [];
            ko.utils.domData.set(node, domDataKey, allDisposeCallbacks);
        }
        return allDisposeCallbacks;
    }
    function destroyCallbacksCollection(node) {
        ko.utils.domData.set(node, domDataKey, undefined);
    }

    function cleanSingleNode(node) {
        // Run all the dispose callbacks
        var callbacks = getDisposeCallbacksCollection(node, false);
        if (callbacks) {
            callbacks = callbacks.slice(0); // Clone, as the array may be modified during iteration (typically, callbacks will remove themselves)
            for (var i = 0; i < callbacks.length; i++)
                callbacks[i](node);
        }

        // Erase the DOM data
        ko.utils.domData.clear(node);

        // Perform cleanup needed by external libraries (currently only jQuery, but can be extended)
        ko.utils.domNodeDisposal["cleanExternalData"](node);

        // Clear any immediate-child comment nodes, as these wouldn't have been found by
        // node.getElementsByTagName("*") in cleanNode() (comment nodes aren't elements)
        if (cleanableNodeTypesWithDescendants[node.nodeType])
            cleanImmediateCommentTypeChildren(node);
    }

    function cleanImmediateCommentTypeChildren(nodeWithChildren) {
        var child, nextChild = nodeWithChildren.firstChild;
        while (child = nextChild) {
            nextChild = child.nextSibling;
            if (child.nodeType === 8)
                cleanSingleNode(child);
        }
    }

    return {
        addDisposeCallback : function(node, callback) {
            if (typeof callback != "function")
                throw new Error("Callback must be a function");
            getDisposeCallbacksCollection(node, true).push(callback);
        },

        removeDisposeCallback : function(node, callback) {
            var callbacksCollection = getDisposeCallbacksCollection(node, false);
            if (callbacksCollection) {
                ko.utils.arrayRemoveItem(callbacksCollection, callback);
                if (callbacksCollection.length == 0)
                    destroyCallbacksCollection(node);
            }
        },

        cleanNode : function(node) {
            // First clean this node, where applicable
            if (cleanableNodeTypes[node.nodeType]) {
                cleanSingleNode(node);

                // ... then its descendants, where applicable
                if (cleanableNodeTypesWithDescendants[node.nodeType]) {
                    // Clone the descendants list in case it changes during iteration
                    var descendants = [];
                    ko.utils.arrayPushAll(descendants, node.getElementsByTagName("*"));
                    for (var i = 0, j = descendants.length; i < j; i++)
                        cleanSingleNode(descendants[i]);
                }
            }
            return node;
        },

        removeNode : function(node) {
            ko.cleanNode(node);
            if (node.parentNode)
                node.parentNode.removeChild(node);
        },

        "cleanExternalData" : function (node) {
            // Special support for jQuery here because it's so commonly used.
            // Many jQuery plugins (including jquery.tmpl) store data using jQuery's equivalent of domData
            // so notify it to tear down any resources associated with the node & descendants here.
            if (jQueryInstance && (typeof jQueryInstance['cleanData'] == "function"))
                jQueryInstance['cleanData']([node]);
        }
    };
})();
ko.cleanNode = ko.utils.domNodeDisposal.cleanNode; // Shorthand name for convenience
ko.removeNode = ko.utils.domNodeDisposal.removeNode; // Shorthand name for convenience
ko.exportSymbol('cleanNode', ko.cleanNode);
ko.exportSymbol('removeNode', ko.removeNode);
ko.exportSymbol('utils.domNodeDisposal', ko.utils.domNodeDisposal);
ko.exportSymbol('utils.domNodeDisposal.addDisposeCallback', ko.utils.domNodeDisposal.addDisposeCallback);
ko.exportSymbol('utils.domNodeDisposal.removeDisposeCallback', ko.utils.domNodeDisposal.removeDisposeCallback);
(function () {
    var none = [0, "", ""],
        table = [1, "<table>", "</table>"],
        tbody = [2, "<table><tbody>", "</tbody></table>"],
        tr = [3, "<table><tbody><tr>", "</tr></tbody></table>"],
        select = [1, "<select multiple='multiple'>", "</select>"],
        lookup = {
            'thead': table,
            'tbody': table,
            'tfoot': table,
            'tr': tbody,
            'td': tr,
            'th': tr,
            'option': select,
            'optgroup': select
        },

        // This is needed for old IE if you're *not* using either jQuery or innerShiv. Doesn't affect other cases.
        mayRequireCreateElementHack = ko.utils.ieVersion <= 8;

    function getWrap(tags) {
        var m = tags.match(/^<([a-z]+)[ >]/);
        return (m && lookup[m[1]]) || none;
    }

    function simpleHtmlParse(html, documentContext) {
        documentContext || (documentContext = document);
        var windowContext = documentContext['parentWindow'] || documentContext['defaultView'] || window;

        // Based on jQuery's "clean" function, but only accounting for table-related elements.
        // If you have referenced jQuery, this won't be used anyway - KO will use jQuery's "clean" function directly

        // Note that there's still an issue in IE < 9 whereby it will discard comment nodes that are the first child of
        // a descendant node. For example: "<div><!-- mycomment -->abc</div>" will get parsed as "<div>abc</div>"
        // This won't affect anyone who has referenced jQuery, and there's always the workaround of inserting a dummy node
        // (possibly a text node) in front of the comment. So, KO does not attempt to workaround this IE issue automatically at present.

        // Trim whitespace, otherwise indexOf won't work as expected
        var tags = ko.utils.stringTrim(html).toLowerCase(), div = documentContext.createElement("div"),
            wrap = getWrap(tags),
            depth = wrap[0];

        // Go to html and back, then peel off extra wrappers
        // Note that we always prefix with some dummy text, because otherwise, IE<9 will strip out leading comment nodes in descendants. Total madness.
        var markup = "ignored<div>" + wrap[1] + html + wrap[2] + "</div>";
        if (typeof windowContext['innerShiv'] == "function") {
            // Note that innerShiv is deprecated in favour of html5shiv. We should consider adding
            // support for html5shiv (except if no explicit support is needed, e.g., if html5shiv
            // somehow shims the native APIs so it just works anyway)
            div.appendChild(windowContext['innerShiv'](markup));
        } else {
            if (mayRequireCreateElementHack) {
                // The document.createElement('my-element') trick to enable custom elements in IE6-8
                // only works if we assign innerHTML on an element associated with that document.
                documentContext.appendChild(div);
            }

            div.innerHTML = markup;

            if (mayRequireCreateElementHack) {
                div.parentNode.removeChild(div);
            }
        }

        // Move to the right depth
        while (depth--)
            div = div.lastChild;

        return ko.utils.makeArray(div.lastChild.childNodes);
    }

    function jQueryHtmlParse(html, documentContext) {
        // jQuery's "parseHTML" function was introduced in jQuery 1.8.0 and is a documented public API.
        if (jQueryInstance['parseHTML']) {
            return jQueryInstance['parseHTML'](html, documentContext) || []; // Ensure we always return an array and never null
        } else {
            // For jQuery < 1.8.0, we fall back on the undocumented internal "clean" function.
            var elems = jQueryInstance['clean']([html], documentContext);

            // As of jQuery 1.7.1, jQuery parses the HTML by appending it to some dummy parent nodes held in an in-memory document fragment.
            // Unfortunately, it never clears the dummy parent nodes from the document fragment, so it leaks memory over time.
            // Fix this by finding the top-most dummy parent element, and detaching it from its owner fragment.
            if (elems && elems[0]) {
                // Find the top-most parent element that's a direct child of a document fragment
                var elem = elems[0];
                while (elem.parentNode && elem.parentNode.nodeType !== 11 /* i.e., DocumentFragment */)
                    elem = elem.parentNode;
                // ... then detach it
                if (elem.parentNode)
                    elem.parentNode.removeChild(elem);
            }

            return elems;
        }
    }

    ko.utils.parseHtmlFragment = function(html, documentContext) {
        return jQueryInstance ?
            jQueryHtmlParse(html, documentContext) :   // As below, benefit from jQuery's optimisations where possible
            simpleHtmlParse(html, documentContext);  // ... otherwise, this simple logic will do in most common cases.
    };

    ko.utils.setHtml = function(node, html) {
        ko.utils.emptyDomNode(node);

        // There's no legitimate reason to display a stringified observable without unwrapping it, so we'll unwrap it
        html = ko.utils.unwrapObservable(html);

        if ((html !== null) && (html !== undefined)) {
            if (typeof html != 'string')
                html = html.toString();

            // jQuery contains a lot of sophisticated code to parse arbitrary HTML fragments,
            // for example <tr> elements which are not normally allowed to exist on their own.
            // If you've referenced jQuery we'll use that rather than duplicating its code.
            if (jQueryInstance) {
                jQueryInstance(node)['html'](html);
            } else {
                // ... otherwise, use KO's own parsing logic.
                var parsedNodes = ko.utils.parseHtmlFragment(html, node.ownerDocument);
                for (var i = 0; i < parsedNodes.length; i++)
                    node.appendChild(parsedNodes[i]);
            }
        }
    };
})();

ko.exportSymbol('utils.parseHtmlFragment', ko.utils.parseHtmlFragment);
ko.exportSymbol('utils.setHtml', ko.utils.setHtml);

ko.memoization = (function () {
    var memos = {};

    function randomMax8HexChars() {
        return (((1 + Math.random()) * 0x100000000) | 0).toString(16).substring(1);
    }
    function generateRandomId() {
        return randomMax8HexChars() + randomMax8HexChars();
    }
    function findMemoNodes(rootNode, appendToArray) {
        if (!rootNode)
            return;
        if (rootNode.nodeType == 8) {
            var memoId = ko.memoization.parseMemoText(rootNode.nodeValue);
            if (memoId != null)
                appendToArray.push({ domNode: rootNode, memoId: memoId });
        } else if (rootNode.nodeType == 1) {
            for (var i = 0, childNodes = rootNode.childNodes, j = childNodes.length; i < j; i++)
                findMemoNodes(childNodes[i], appendToArray);
        }
    }

    return {
        memoize: function (callback) {
            if (typeof callback != "function")
                throw new Error("You can only pass a function to ko.memoization.memoize()");
            var memoId = generateRandomId();
            memos[memoId] = callback;
            return "<!--[ko_memo:" + memoId + "]-->";
        },

        unmemoize: function (memoId, callbackParams) {
            var callback = memos[memoId];
            if (callback === undefined)
                throw new Error("Couldn't find any memo with ID " + memoId + ". Perhaps it's already been unmemoized.");
            try {
                callback.apply(null, callbackParams || []);
                return true;
            }
            finally { delete memos[memoId]; }
        },

        unmemoizeDomNodeAndDescendants: function (domNode, extraCallbackParamsArray) {
            var memos = [];
            findMemoNodes(domNode, memos);
            for (var i = 0, j = memos.length; i < j; i++) {
                var node = memos[i].domNode;
                var combinedParams = [node];
                if (extraCallbackParamsArray)
                    ko.utils.arrayPushAll(combinedParams, extraCallbackParamsArray);
                ko.memoization.unmemoize(memos[i].memoId, combinedParams);
                node.nodeValue = ""; // Neuter this node so we don't try to unmemoize it again
                if (node.parentNode)
                    node.parentNode.removeChild(node); // If possible, erase it totally (not always possible - someone else might just hold a reference to it then call unmemoizeDomNodeAndDescendants again)
            }
        },

        parseMemoText: function (memoText) {
            var match = memoText.match(/^\[ko_memo\:(.*?)\]$/);
            return match ? match[1] : null;
        }
    };
})();

ko.exportSymbol('memoization', ko.memoization);
ko.exportSymbol('memoization.memoize', ko.memoization.memoize);
ko.exportSymbol('memoization.unmemoize', ko.memoization.unmemoize);
ko.exportSymbol('memoization.parseMemoText', ko.memoization.parseMemoText);
ko.exportSymbol('memoization.unmemoizeDomNodeAndDescendants', ko.memoization.unmemoizeDomNodeAndDescendants);
ko.tasks = (function () {
    var scheduler,
        taskQueue = [],
        taskQueueLength = 0,
        nextHandle = 1,
        nextIndexToProcess = 0;

    if (window['MutationObserver']) {
        // Chrome 27+, Firefox 14+, IE 11+, Opera 15+, Safari 6.1+
        // From https://github.com/petkaantonov/bluebird * Copyright (c) 2014 Petka Antonov * License: MIT
        scheduler = (function (callback) {
            var div = document.createElement("div");
            new MutationObserver(callback).observe(div, {attributes: true});
            return function () { div.classList.toggle("foo"); };
        })(scheduledProcess);
    } else if (document && "onreadystatechange" in document.createElement("script")) {
        // IE 6-10
        // From https://github.com/YuzuJS/setImmediate * Copyright (c) 2012 Barnesandnoble.com, llc, Donavon West, and Domenic Denicola * License: MIT
        scheduler = function (callback) {
            var script = document.createElement("script");
            script.onreadystatechange = function () {
                script.onreadystatechange = null;
                document.documentElement.removeChild(script);
                script = null;
                callback();
            };
            document.documentElement.appendChild(script);
        };
    } else {
        scheduler = function (callback) {
            setTimeout(callback, 0);
        };
    }

    function processTasks() {
        if (taskQueueLength) {
            // Each mark represents the end of a logical group of tasks and the number of these groups is
            // limited to prevent unchecked recursion.
            var mark = taskQueueLength, countMarks = 0;

            // nextIndexToProcess keeps track of where we are in the queue; processTasks can be called recursively without issue
            for (var task; nextIndexToProcess < taskQueueLength; ) {
                if (task = taskQueue[nextIndexToProcess++]) {
                    if (nextIndexToProcess > mark) {
                        if (++countMarks >= 5000) {
                            nextIndexToProcess = taskQueueLength;   // skip all tasks remaining in the queue since any of them could be causing the recursion
                            ko.utils.deferError(Error("'Too much recursion' after processing " + countMarks + " task groups."));
                            break;
                        }
                        mark = taskQueueLength;
                    }
                    try {
                        task();
                    } catch (ex) {
                        ko.utils.deferError(ex);
                    }
                }
            }
        }
    }

    function scheduledProcess() {
        processTasks();

        // Reset the queue
        nextIndexToProcess = taskQueueLength = taskQueue.length = 0;
    }

    function scheduleTaskProcessing() {
        ko.tasks['scheduler'](scheduledProcess);
    }

    var tasks = {
        'scheduler': scheduler,     // Allow overriding the scheduler

        schedule: function (func) {
            if (!taskQueueLength) {
                scheduleTaskProcessing();
            }

            taskQueue[taskQueueLength++] = func;
            return nextHandle++;
        },

        cancel: function (handle) {
            var index = handle - (nextHandle - taskQueueLength);
            if (index >= nextIndexToProcess && index < taskQueueLength) {
                taskQueue[index] = null;
            }
        },

        // For testing only: reset the queue and return the previous queue length
        'resetForTesting': function () {
            var length = taskQueueLength - nextIndexToProcess;
            nextIndexToProcess = taskQueueLength = taskQueue.length = 0;
            return length;
        },

        runEarly: processTasks
    };

    return tasks;
})();

ko.exportSymbol('tasks', ko.tasks);
ko.exportSymbol('tasks.schedule', ko.tasks.schedule);
//ko.exportSymbol('tasks.cancel', ko.tasks.cancel);  "cancel" isn't minified
ko.exportSymbol('tasks.runEarly', ko.tasks.runEarly);
ko.extenders = {
    'throttle': function(target, timeout) {
        // Throttling means two things:

        // (1) For dependent observables, we throttle *evaluations* so that, no matter how fast its dependencies
        //     notify updates, the target doesn't re-evaluate (and hence doesn't notify) faster than a certain rate
        target['throttleEvaluation'] = timeout;

        // (2) For writable targets (observables, or writable dependent observables), we throttle *writes*
        //     so the target cannot change value synchronously or faster than a certain rate
        var writeTimeoutInstance = null;
        return ko.dependentObservable({
            'read': target,
            'write': function(value) {
                clearTimeout(writeTimeoutInstance);
                writeTimeoutInstance = ko.utils.setTimeout(function() {
                    target(value);
                }, timeout);
            }
        });
    },

    'rateLimit': function(target, options) {
        var timeout, method, limitFunction;

        if (typeof options == 'number') {
            timeout = options;
        } else {
            timeout = options['timeout'];
            method = options['method'];
        }

        // rateLimit supersedes deferred updates
        target._deferUpdates = false;

        limitFunction = method == 'notifyWhenChangesStop' ?  debounce : throttle;
        target.limit(function(callback) {
            return limitFunction(callback, timeout);
        });
    },

    'deferred': function(target, options) {
        if (options !== true) {
            throw new Error('The \'deferred\' extender only accepts the value \'true\', because it is not supported to turn deferral off once enabled.')
        }

        if (!target._deferUpdates) {
            target._deferUpdates = true;
            target.limit(function (callback) {
                var handle;
                return function () {
                    ko.tasks.cancel(handle);
                    handle = ko.tasks.schedule(callback);
                    target['notifySubscribers'](undefined, 'dirty');
                };
            });
        }
    },

    'notify': function(target, notifyWhen) {
        target["equalityComparer"] = notifyWhen == "always" ?
            null :  // null equalityComparer means to always notify
            valuesArePrimitiveAndEqual;
    }
};

var primitiveTypes = { 'undefined':1, 'boolean':1, 'number':1, 'string':1 };
function valuesArePrimitiveAndEqual(a, b) {
    var oldValueIsPrimitive = (a === null) || (typeof(a) in primitiveTypes);
    return oldValueIsPrimitive ? (a === b) : false;
}

function throttle(callback, timeout) {
    var timeoutInstance;
    return function () {
        if (!timeoutInstance) {
            timeoutInstance = ko.utils.setTimeout(function () {
                timeoutInstance = undefined;
                callback();
            }, timeout);
        }
    };
}

function debounce(callback, timeout) {
    var timeoutInstance;
    return function () {
        clearTimeout(timeoutInstance);
        timeoutInstance = ko.utils.setTimeout(callback, timeout);
    };
}

function applyExtenders(requestedExtenders) {
    var target = this;
    if (requestedExtenders) {
        ko.utils.objectForEach(requestedExtenders, function(key, value) {
            var extenderHandler = ko.extenders[key];
            if (typeof extenderHandler == 'function') {
                target = extenderHandler(target, value) || target;
            }
        });
    }
    return target;
}

ko.exportSymbol('extenders', ko.extenders);

ko.subscription = function (target, callback, disposeCallback) {
    this._target = target;
    this.callback = callback;
    this.disposeCallback = disposeCallback;
    this.isDisposed = false;
    ko.exportProperty(this, 'dispose', this.dispose);
};
ko.subscription.prototype.dispose = function () {
    this.isDisposed = true;
    this.disposeCallback();
};

ko.subscribable = function () {
    ko.utils.setPrototypeOfOrExtend(this, ko_subscribable_fn);
    ko_subscribable_fn.init(this);
}

var defaultEvent = "change";

// Moved out of "limit" to avoid the extra closure
function limitNotifySubscribers(value, event) {
    if (!event || event === defaultEvent) {
        this._limitChange(value);
    } else if (event === 'beforeChange') {
        this._limitBeforeChange(value);
    } else {
        this._origNotifySubscribers(value, event);
    }
}

var ko_subscribable_fn = {
    init: function(instance) {
        instance._subscriptions = {};
        instance._versionNumber = 1;
    },

    subscribe: function (callback, callbackTarget, event) {
        var self = this;

        event = event || defaultEvent;
        var boundCallback = callbackTarget ? callback.bind(callbackTarget) : callback;

        var subscription = new ko.subscription(self, boundCallback, function () {
            ko.utils.arrayRemoveItem(self._subscriptions[event], subscription);
            if (self.afterSubscriptionRemove)
                self.afterSubscriptionRemove(event);
        });

        if (self.beforeSubscriptionAdd)
            self.beforeSubscriptionAdd(event);

        if (!self._subscriptions[event])
            self._subscriptions[event] = [];
        self._subscriptions[event].push(subscription);

        return subscription;
    },

    "notifySubscribers": function (valueToNotify, event) {
        event = event || defaultEvent;
        if (event === defaultEvent) {
            this.updateVersion();
        }
        if (this.hasSubscriptionsForEvent(event)) {
            try {
                ko.dependencyDetection.begin(); // Begin suppressing dependency detection (by setting the top frame to undefined)
                for (var a = this._subscriptions[event].slice(0), i = 0, subscription; subscription = a[i]; ++i) {
                    // In case a subscription was disposed during the arrayForEach cycle, check
                    // for isDisposed on each subscription before invoking its callback
                    if (!subscription.isDisposed)
                        subscription.callback(valueToNotify);
                }
            } finally {
                ko.dependencyDetection.end(); // End suppressing dependency detection
            }
        }
    },

    getVersion: function () {
        return this._versionNumber;
    },

    hasChanged: function (versionToCheck) {
        return this.getVersion() !== versionToCheck;
    },

    updateVersion: function () {
        ++this._versionNumber;
    },

    limit: function(limitFunction) {
        var self = this, selfIsObservable = ko.isObservable(self),
            ignoreBeforeChange, previousValue, pendingValue, beforeChange = 'beforeChange';

        if (!self._origNotifySubscribers) {
            self._origNotifySubscribers = self["notifySubscribers"];
            self["notifySubscribers"] = limitNotifySubscribers;
        }

        var finish = limitFunction(function() {
            self._notificationIsPending = false;

            // If an observable provided a reference to itself, access it to get the latest value.
            // This allows computed observables to delay calculating their value until needed.
            if (selfIsObservable && pendingValue === self) {
                pendingValue = self();
            }
            ignoreBeforeChange = false;
            if (self.isDifferent(previousValue, pendingValue)) {
                self._origNotifySubscribers(previousValue = pendingValue);
            }
        });

        self._limitChange = function(value) {
            self._notificationIsPending = ignoreBeforeChange = true;
            pendingValue = value;
            finish();
        };
        self._limitBeforeChange = function(value) {
            if (!ignoreBeforeChange) {
                previousValue = value;
                self._origNotifySubscribers(value, beforeChange);
            }
        };
    },

    hasSubscriptionsForEvent: function(event) {
        return this._subscriptions[event] && this._subscriptions[event].length;
    },

    getSubscriptionsCount: function (event) {
        if (event) {
            return this._subscriptions[event] && this._subscriptions[event].length || 0;
        } else {
            var total = 0;
            ko.utils.objectForEach(this._subscriptions, function(eventName, subscriptions) {
                if (eventName !== 'dirty')
                    total += subscriptions.length;
            });
            return total;
        }
    },

    isDifferent: function(oldValue, newValue) {
        return !this['equalityComparer'] || !this['equalityComparer'](oldValue, newValue);
    },

    extend: applyExtenders
};

ko.exportProperty(ko_subscribable_fn, 'subscribe', ko_subscribable_fn.subscribe);
ko.exportProperty(ko_subscribable_fn, 'extend', ko_subscribable_fn.extend);
ko.exportProperty(ko_subscribable_fn, 'getSubscriptionsCount', ko_subscribable_fn.getSubscriptionsCount);

// For browsers that support proto assignment, we overwrite the prototype of each
// observable instance. Since observables are functions, we need Function.prototype
// to still be in the prototype chain.
if (ko.utils.canSetPrototype) {
    ko.utils.setPrototypeOf(ko_subscribable_fn, Function.prototype);
}

ko.subscribable['fn'] = ko_subscribable_fn;


ko.isSubscribable = function (instance) {
    return instance != null && typeof instance.subscribe == "function" && typeof instance["notifySubscribers"] == "function";
};

ko.exportSymbol('subscribable', ko.subscribable);
ko.exportSymbol('isSubscribable', ko.isSubscribable);

ko.computedContext = ko.dependencyDetection = (function () {
    var outerFrames = [],
        currentFrame,
        lastId = 0;

    // Return a unique ID that can be assigned to an observable for dependency tracking.
    // Theoretically, you could eventually overflow the number storage size, resulting
    // in duplicate IDs. But in JavaScript, the largest exact integral value is 2^53
    // or 9,007,199,254,740,992. If you created 1,000,000 IDs per second, it would
    // take over 285 years to reach that number.
    // Reference http://blog.vjeux.com/2010/javascript/javascript-max_int-number-limits.html
    function getId() {
        return ++lastId;
    }

    function begin(options) {
        outerFrames.push(currentFrame);
        currentFrame = options;
    }

    function end() {
        currentFrame = outerFrames.pop();
    }

    return {
        begin: begin,

        end: end,

        registerDependency: function (subscribable) {
            if (currentFrame) {
                if (!ko.isSubscribable(subscribable))
                    throw new Error("Only subscribable things can act as dependencies");
                currentFrame.callback.call(currentFrame.callbackTarget, subscribable, subscribable._id || (subscribable._id = getId()));
            }
        },

        ignore: function (callback, callbackTarget, callbackArgs) {
            try {
                begin();
                return callback.apply(callbackTarget, callbackArgs || []);
            } finally {
                end();
            }
        },

        getDependenciesCount: function () {
            if (currentFrame)
                return currentFrame.computed.getDependenciesCount();
        },

        isInitial: function() {
            if (currentFrame)
                return currentFrame.isInitial;
        }
    };
})();

ko.exportSymbol('computedContext', ko.computedContext);
ko.exportSymbol('computedContext.getDependenciesCount', ko.computedContext.getDependenciesCount);
ko.exportSymbol('computedContext.isInitial', ko.computedContext.isInitial);

ko.exportSymbol('ignoreDependencies', ko.ignoreDependencies = ko.dependencyDetection.ignore);
var observableLatestValue = ko.utils.createSymbolOrString('_latestValue');

ko.observable = function (initialValue) {
    function observable() {
        if (arguments.length > 0) {
            // Write

            // Ignore writes if the value hasn't changed
            if (observable.isDifferent(observable[observableLatestValue], arguments[0])) {
                observable.valueWillMutate();
                observable[observableLatestValue] = arguments[0];
                observable.valueHasMutated();
            }
            return this; // Permits chained assignments
        }
        else {
            // Read
            ko.dependencyDetection.registerDependency(observable); // The caller only needs to be notified of changes if they did a "read" operation
            return observable[observableLatestValue];
        }
    }

    observable[observableLatestValue] = initialValue;

    // Inherit from 'subscribable'
    if (!ko.utils.canSetPrototype) {
        // 'subscribable' won't be on the prototype chain unless we put it there directly
        ko.utils.extend(observable, ko.subscribable['fn']);
    }
    ko.subscribable['fn'].init(observable);

    // Inherit from 'observable'
    ko.utils.setPrototypeOfOrExtend(observable, observableFn);

    if (ko.options['deferUpdates']) {
        ko.extenders['deferred'](observable, true);
    }

    return observable;
}

// Define prototype for observables
var observableFn = {
    'equalityComparer': valuesArePrimitiveAndEqual,
    peek: function() { return this[observableLatestValue]; },
    valueHasMutated: function () { this['notifySubscribers'](this[observableLatestValue]); },
    valueWillMutate: function () { this['notifySubscribers'](this[observableLatestValue], 'beforeChange'); }
};

// Note that for browsers that don't support proto assignment, the
// inheritance chain is created manually in the ko.observable constructor
if (ko.utils.canSetPrototype) {
    ko.utils.setPrototypeOf(observableFn, ko.subscribable['fn']);
}

var protoProperty = ko.observable.protoProperty = '__ko_proto__';
observableFn[protoProperty] = ko.observable;

ko.hasPrototype = function(instance, prototype) {
    if ((instance === null) || (instance === undefined) || (instance[protoProperty] === undefined)) return false;
    if (instance[protoProperty] === prototype) return true;
    return ko.hasPrototype(instance[protoProperty], prototype); // Walk the prototype chain
};

ko.isObservable = function (instance) {
    return ko.hasPrototype(instance, ko.observable);
}
ko.isWriteableObservable = function (instance) {
    // Observable
    if ((typeof instance == 'function') && instance[protoProperty] === ko.observable)
        return true;
    // Writeable dependent observable
    if ((typeof instance == 'function') && (instance[protoProperty] === ko.dependentObservable) && (instance.hasWriteFunction))
        return true;
    // Anything else
    return false;
}

ko.exportSymbol('observable', ko.observable);
ko.exportSymbol('isObservable', ko.isObservable);
ko.exportSymbol('isWriteableObservable', ko.isWriteableObservable);
ko.exportSymbol('isWritableObservable', ko.isWriteableObservable);
ko.exportSymbol('observable.fn', observableFn);
ko.exportProperty(observableFn, 'peek', observableFn.peek);
ko.exportProperty(observableFn, 'valueHasMutated', observableFn.valueHasMutated);
ko.exportProperty(observableFn, 'valueWillMutate', observableFn.valueWillMutate);
ko.observableArray = function (initialValues) {
    initialValues = initialValues || [];

    if (typeof initialValues != 'object' || !('length' in initialValues))
        throw new Error("The argument passed when initializing an observable array must be an array, or null, or undefined.");

    var result = ko.observable(initialValues);
    ko.utils.setPrototypeOfOrExtend(result, ko.observableArray['fn']);
    return result.extend({'trackArrayChanges':true});
};

ko.observableArray['fn'] = {
    'remove': function (valueOrPredicate) {
        var underlyingArray = this.peek();
        var removedValues = [];
        var predicate = typeof valueOrPredicate == "function" && !ko.isObservable(valueOrPredicate) ? valueOrPredicate : function (value) { return value === valueOrPredicate; };
        for (var i = 0; i < underlyingArray.length; i++) {
            var value = underlyingArray[i];
            if (predicate(value)) {
                if (removedValues.length === 0) {
                    this.valueWillMutate();
                }
                removedValues.push(value);
                underlyingArray.splice(i, 1);
                i--;
            }
        }
        if (removedValues.length) {
            this.valueHasMutated();
        }
        return removedValues;
    },

    'removeAll': function (arrayOfValues) {
        // If you passed zero args, we remove everything
        if (arrayOfValues === undefined) {
            var underlyingArray = this.peek();
            var allValues = underlyingArray.slice(0);
            this.valueWillMutate();
            underlyingArray.splice(0, underlyingArray.length);
            this.valueHasMutated();
            return allValues;
        }
        // If you passed an arg, we interpret it as an array of entries to remove
        if (!arrayOfValues)
            return [];
        return this['remove'](function (value) {
            return ko.utils.arrayIndexOf(arrayOfValues, value) >= 0;
        });
    },

    'destroy': function (valueOrPredicate) {
        var underlyingArray = this.peek();
        var predicate = typeof valueOrPredicate == "function" && !ko.isObservable(valueOrPredicate) ? valueOrPredicate : function (value) { return value === valueOrPredicate; };
        this.valueWillMutate();
        for (var i = underlyingArray.length - 1; i >= 0; i--) {
            var value = underlyingArray[i];
            if (predicate(value))
                underlyingArray[i]["_destroy"] = true;
        }
        this.valueHasMutated();
    },

    'destroyAll': function (arrayOfValues) {
        // If you passed zero args, we destroy everything
        if (arrayOfValues === undefined)
            return this['destroy'](function() { return true });

        // If you passed an arg, we interpret it as an array of entries to destroy
        if (!arrayOfValues)
            return [];
        return this['destroy'](function (value) {
            return ko.utils.arrayIndexOf(arrayOfValues, value) >= 0;
        });
    },

    'indexOf': function (item) {
        var underlyingArray = this();
        return ko.utils.arrayIndexOf(underlyingArray, item);
    },

    'replace': function(oldItem, newItem) {
        var index = this['indexOf'](oldItem);
        if (index >= 0) {
            this.valueWillMutate();
            this.peek()[index] = newItem;
            this.valueHasMutated();
        }
    }
};

// Note that for browsers that don't support proto assignment, the
// inheritance chain is created manually in the ko.observableArray constructor
if (ko.utils.canSetPrototype) {
    ko.utils.setPrototypeOf(ko.observableArray['fn'], ko.observable['fn']);
}

// Populate ko.observableArray.fn with read/write functions from native arrays
// Important: Do not add any additional functions here that may reasonably be used to *read* data from the array
// because we'll eval them without causing subscriptions, so ko.computed output could end up getting stale
ko.utils.arrayForEach(["pop", "push", "reverse", "shift", "sort", "splice", "unshift"], function (methodName) {
    ko.observableArray['fn'][methodName] = function () {
        // Use "peek" to avoid creating a subscription in any computed that we're executing in the context of
        // (for consistency with mutating regular observables)
        var underlyingArray = this.peek();
        this.valueWillMutate();
        this.cacheDiffForKnownOperation(underlyingArray, methodName, arguments);
        var methodCallResult = underlyingArray[methodName].apply(underlyingArray, arguments);
        this.valueHasMutated();
        // The native sort and reverse methods return a reference to the array, but it makes more sense to return the observable array instead.
        return methodCallResult === underlyingArray ? this : methodCallResult;
    };
});

// Populate ko.observableArray.fn with read-only functions from native arrays
ko.utils.arrayForEach(["slice"], function (methodName) {
    ko.observableArray['fn'][methodName] = function () {
        var underlyingArray = this();
        return underlyingArray[methodName].apply(underlyingArray, arguments);
    };
});

ko.exportSymbol('observableArray', ko.observableArray);
var arrayChangeEventName = 'arrayChange';
ko.extenders['trackArrayChanges'] = function(target, options) {
    // Use the provided options--each call to trackArrayChanges overwrites the previously set options
    target.compareArrayOptions = {};
    if (options && typeof options == "object") {
        ko.utils.extend(target.compareArrayOptions, options);
    }
    target.compareArrayOptions['sparse'] = true;

    // Only modify the target observable once
    if (target.cacheDiffForKnownOperation) {
        return;
    }
    var trackingChanges = false,
        cachedDiff = null,
        arrayChangeSubscription,
        pendingNotifications = 0,
        underlyingBeforeSubscriptionAddFunction = target.beforeSubscriptionAdd,
        underlyingAfterSubscriptionRemoveFunction = target.afterSubscriptionRemove;

    // Watch "subscribe" calls, and for array change events, ensure change tracking is enabled
    target.beforeSubscriptionAdd = function (event) {
        if (underlyingBeforeSubscriptionAddFunction)
            underlyingBeforeSubscriptionAddFunction.call(target, event);
        if (event === arrayChangeEventName) {
            trackChanges();
        }
    };
    // Watch "dispose" calls, and for array change events, ensure change tracking is disabled when all are disposed
    target.afterSubscriptionRemove = function (event) {
        if (underlyingAfterSubscriptionRemoveFunction)
            underlyingAfterSubscriptionRemoveFunction.call(target, event);
        if (event === arrayChangeEventName && !target.hasSubscriptionsForEvent(arrayChangeEventName)) {
            arrayChangeSubscription.dispose();
            trackingChanges = false;
        }
    };

    function trackChanges() {
        // Calling 'trackChanges' multiple times is the same as calling it once
        if (trackingChanges) {
            return;
        }

        trackingChanges = true;

        // Intercept "notifySubscribers" to track how many times it was called.
        var underlyingNotifySubscribersFunction = target['notifySubscribers'];
        target['notifySubscribers'] = function(valueToNotify, event) {
            if (!event || event === defaultEvent) {
                ++pendingNotifications;
            }
            return underlyingNotifySubscribersFunction.apply(this, arguments);
        };

        // Each time the array changes value, capture a clone so that on the next
        // change it's possible to produce a diff
        var previousContents = [].concat(target.peek() || []);
        cachedDiff = null;
        arrayChangeSubscription = target.subscribe(function(currentContents) {
            // Make a copy of the current contents and ensure it's an array
            currentContents = [].concat(currentContents || []);

            // Compute the diff and issue notifications, but only if someone is listening
            if (target.hasSubscriptionsForEvent(arrayChangeEventName)) {
                var changes = getChanges(previousContents, currentContents);
            }

            // Eliminate references to the old, removed items, so they can be GCed
            previousContents = currentContents;
            cachedDiff = null;
            pendingNotifications = 0;

            if (changes && changes.length) {
                target['notifySubscribers'](changes, arrayChangeEventName);
            }
        });
    }

    function getChanges(previousContents, currentContents) {
        // We try to re-use cached diffs.
        // The scenarios where pendingNotifications > 1 are when using rate-limiting or the Deferred Updates
        // plugin, which without this check would not be compatible with arrayChange notifications. Normally,
        // notifications are issued immediately so we wouldn't be queueing up more than one.
        if (!cachedDiff || pendingNotifications > 1) {
            cachedDiff = ko.utils.compareArrays(previousContents, currentContents, target.compareArrayOptions);
        }

        return cachedDiff;
    }

    target.cacheDiffForKnownOperation = function(rawArray, operationName, args) {
        // Only run if we're currently tracking changes for this observable array
        // and there aren't any pending deferred notifications.
        if (!trackingChanges || pendingNotifications) {
            return;
        }
        var diff = [],
            arrayLength = rawArray.length,
            argsLength = args.length,
            offset = 0;

        function pushDiff(status, value, index) {
            return diff[diff.length] = { 'status': status, 'value': value, 'index': index };
        }
        switch (operationName) {
            case 'push':
                offset = arrayLength;
            case 'unshift':
                for (var index = 0; index < argsLength; index++) {
                    pushDiff('added', args[index], offset + index);
                }
                break;

            case 'pop':
                offset = arrayLength - 1;
            case 'shift':
                if (arrayLength) {
                    pushDiff('deleted', rawArray[offset], offset);
                }
                break;

            case 'splice':
                // Negative start index means 'from end of array'. After that we clamp to [0...arrayLength].
                // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice
                var startIndex = Math.min(Math.max(0, args[0] < 0 ? arrayLength + args[0] : args[0]), arrayLength),
                    endDeleteIndex = argsLength === 1 ? arrayLength : Math.min(startIndex + (args[1] || 0), arrayLength),
                    endAddIndex = startIndex + argsLength - 2,
                    endIndex = Math.max(endDeleteIndex, endAddIndex),
                    additions = [], deletions = [];
                for (var index = startIndex, argsIndex = 2; index < endIndex; ++index, ++argsIndex) {
                    if (index < endDeleteIndex)
                        deletions.push(pushDiff('deleted', rawArray[index], index));
                    if (index < endAddIndex)
                        additions.push(pushDiff('added', args[argsIndex], index));
                }
                ko.utils.findMovesInArrayComparison(deletions, additions);
                break;

            default:
                return;
        }
        cachedDiff = diff;
    };
};
var computedState = ko.utils.createSymbolOrString('_state');

ko.computed = ko.dependentObservable = function (evaluatorFunctionOrOptions, evaluatorFunctionTarget, options) {
    if (typeof evaluatorFunctionOrOptions === "object") {
        // Single-parameter syntax - everything is on this "options" param
        options = evaluatorFunctionOrOptions;
    } else {
        // Multi-parameter syntax - construct the options according to the params passed
        options = options || {};
        if (evaluatorFunctionOrOptions) {
            options["read"] = evaluatorFunctionOrOptions;
        }
    }
    if (typeof options["read"] != "function")
        throw Error("Pass a function that returns the value of the ko.computed");

    var writeFunction = options["write"];
    var state = {
        latestValue: undefined,
        isStale: true,
        isBeingEvaluated: false,
        suppressDisposalUntilDisposeWhenReturnsFalse: false,
        isDisposed: false,
        pure: false,
        isSleeping: false,
        readFunction: options["read"],
        evaluatorFunctionTarget: evaluatorFunctionTarget || options["owner"],
        disposeWhenNodeIsRemoved: options["disposeWhenNodeIsRemoved"] || options.disposeWhenNodeIsRemoved || null,
        disposeWhen: options["disposeWhen"] || options.disposeWhen,
        domNodeDisposalCallback: null,
        dependencyTracking: {},
        dependenciesCount: 0,
        evaluationTimeoutInstance: null
    };

    function computedObservable() {
        if (arguments.length > 0) {
            if (typeof writeFunction === "function") {
                // Writing a value
                writeFunction.apply(state.evaluatorFunctionTarget, arguments);
            } else {
                throw new Error("Cannot write a value to a ko.computed unless you specify a 'write' option. If you wish to read the current value, don't pass any parameters.");
            }
            return this; // Permits chained assignments
        } else {
            // Reading the value
            ko.dependencyDetection.registerDependency(computedObservable);
            if (state.isStale || (state.isSleeping && computedObservable.haveDependenciesChanged())) {
                computedObservable.evaluateImmediate();
            }
            return state.latestValue;
        }
    }

    computedObservable[computedState] = state;
    computedObservable.hasWriteFunction = typeof writeFunction === "function";

    // Inherit from 'subscribable'
    if (!ko.utils.canSetPrototype) {
        // 'subscribable' won't be on the prototype chain unless we put it there directly
        ko.utils.extend(computedObservable, ko.subscribable['fn']);
    }
    ko.subscribable['fn'].init(computedObservable);

    // Inherit from 'computed'
    ko.utils.setPrototypeOfOrExtend(computedObservable, computedFn);

    if (options['pure']) {
        state.pure = true;
        state.isSleeping = true;     // Starts off sleeping; will awake on the first subscription
        ko.utils.extend(computedObservable, pureComputedOverrides);
    } else if (options['deferEvaluation']) {
        ko.utils.extend(computedObservable, deferEvaluationOverrides);
    }

    if (ko.options['deferUpdates']) {
        ko.extenders['deferred'](computedObservable, true);
    }

    if (DEBUG) {
        // #1731 - Aid debugging by exposing the computed's options
        computedObservable["_options"] = options;
    }

    if (state.disposeWhenNodeIsRemoved) {
        // Since this computed is associated with a DOM node, and we don't want to dispose the computed
        // until the DOM node is *removed* from the document (as opposed to never having been in the document),
        // we'll prevent disposal until "disposeWhen" first returns false.
        state.suppressDisposalUntilDisposeWhenReturnsFalse = true;

        // disposeWhenNodeIsRemoved: true can be used to opt into the "only dispose after first false result"
        // behaviour even if there's no specific node to watch. In that case, clear the option so we don't try
        // to watch for a non-node's disposal. This technique is intended for KO's internal use only and shouldn't
        // be documented or used by application code, as it's likely to change in a future version of KO.
        if (!state.disposeWhenNodeIsRemoved.nodeType) {
            state.disposeWhenNodeIsRemoved = null;
        }
    }

    // Evaluate, unless sleeping or deferEvaluation is true
    if (!state.isSleeping && !options['deferEvaluation']) {
        computedObservable.evaluateImmediate();
    }

    // Attach a DOM node disposal callback so that the computed will be proactively disposed as soon as the node is
    // removed using ko.removeNode. But skip if isActive is false (there will never be any dependencies to dispose).
    if (state.disposeWhenNodeIsRemoved && computedObservable.isActive()) {
        ko.utils.domNodeDisposal.addDisposeCallback(state.disposeWhenNodeIsRemoved, state.domNodeDisposalCallback = function () {
            computedObservable.dispose();
        });
    }

    return computedObservable;
};

// Utility function that disposes a given dependencyTracking entry
function computedDisposeDependencyCallback(id, entryToDispose) {
    if (entryToDispose !== null && entryToDispose.dispose) {
        entryToDispose.dispose();
    }
}

// This function gets called each time a dependency is detected while evaluating a computed.
// It's factored out as a shared function to avoid creating unnecessary function instances during evaluation.
function computedBeginDependencyDetectionCallback(subscribable, id) {
    var computedObservable = this.computedObservable,
        state = computedObservable[computedState];
    if (!state.isDisposed) {
        if (this.disposalCount && this.disposalCandidates[id]) {
            // Don't want to dispose this subscription, as it's still being used
            computedObservable.addDependencyTracking(id, subscribable, this.disposalCandidates[id]);
            this.disposalCandidates[id] = null; // No need to actually delete the property - disposalCandidates is a transient object anyway
            --this.disposalCount;
        } else if (!state.dependencyTracking[id]) {
            // Brand new subscription - add it
            computedObservable.addDependencyTracking(id, subscribable, state.isSleeping ? { _target: subscribable } : computedObservable.subscribeToDependency(subscribable));
        }
    }
}

var computedFn = {
    "equalityComparer": valuesArePrimitiveAndEqual,
    getDependenciesCount: function () {
        return this[computedState].dependenciesCount;
    },
    addDependencyTracking: function (id, target, trackingObj) {
        if (this[computedState].pure && target === this) {
            throw Error("A 'pure' computed must not be called recursively");
        }

        this[computedState].dependencyTracking[id] = trackingObj;
        trackingObj._order = this[computedState].dependenciesCount++;
        trackingObj._version = target.getVersion();
    },
    haveDependenciesChanged: function () {
        var id, dependency, dependencyTracking = this[computedState].dependencyTracking;
        for (id in dependencyTracking) {
            if (dependencyTracking.hasOwnProperty(id)) {
                dependency = dependencyTracking[id];
                if (dependency._target.hasChanged(dependency._version)) {
                    return true;
                }
            }
        }
    },
    markDirty: function () {
        // Process "dirty" events if we can handle delayed notifications
        if (this._evalDelayed && !this[computedState].isBeingEvaluated) {
            this._evalDelayed();
        }
    },
    isActive: function () {
        return this[computedState].isStale || this[computedState].dependenciesCount > 0;
    },
    respondToChange: function () {
        // Ignore "change" events if we've already scheduled a delayed notification
        if (!this._notificationIsPending) {
            this.evaluatePossiblyAsync();
        }
    },
    subscribeToDependency: function (target) {
        if (target._deferUpdates && !this[computedState].disposeWhenNodeIsRemoved) {
            var dirtySub = target.subscribe(this.markDirty, this, 'dirty'),
                changeSub = target.subscribe(this.respondToChange, this);
            return {
                _target: target,
                dispose: function () {
                    dirtySub.dispose();
                    changeSub.dispose();
                }
            };
        } else {
            return target.subscribe(this.evaluatePossiblyAsync, this);
        }
    },
    evaluatePossiblyAsync: function () {
        var computedObservable = this,
            throttleEvaluationTimeout = computedObservable['throttleEvaluation'];
        if (throttleEvaluationTimeout && throttleEvaluationTimeout >= 0) {
            clearTimeout(this[computedState].evaluationTimeoutInstance);
            this[computedState].evaluationTimeoutInstance = ko.utils.setTimeout(function () {
                computedObservable.evaluateImmediate(true /*notifyChange*/);
            }, throttleEvaluationTimeout);
        } else if (computedObservable._evalDelayed) {
            computedObservable._evalDelayed();
        } else {
            computedObservable.evaluateImmediate(true /*notifyChange*/);
        }
    },
    evaluateImmediate: function (notifyChange) {
        var computedObservable = this,
            state = computedObservable[computedState],
            disposeWhen = state.disposeWhen;

        if (state.isBeingEvaluated) {
            // If the evaluation of a ko.computed causes side effects, it's possible that it will trigger its own re-evaluation.
            // This is not desirable (it's hard for a developer to realise a chain of dependencies might cause this, and they almost
            // certainly didn't intend infinite re-evaluations). So, for predictability, we simply prevent ko.computeds from causing
            // their own re-evaluation. Further discussion at https://github.com/SteveSanderson/knockout/pull/387
            return;
        }

        // Do not evaluate (and possibly capture new dependencies) if disposed
        if (state.isDisposed) {
            return;
        }

        if (state.disposeWhenNodeIsRemoved && !ko.utils.domNodeIsAttachedToDocument(state.disposeWhenNodeIsRemoved) || disposeWhen && disposeWhen()) {
            // See comment above about suppressDisposalUntilDisposeWhenReturnsFalse
            if (!state.suppressDisposalUntilDisposeWhenReturnsFalse) {
                computedObservable.dispose();
                return;
            }
        } else {
            // It just did return false, so we can stop suppressing now
            state.suppressDisposalUntilDisposeWhenReturnsFalse = false;
        }

        state.isBeingEvaluated = true;
        try {
            this.evaluateImmediate_CallReadWithDependencyDetection(notifyChange);
        } finally {
            state.isBeingEvaluated = false;
        }

        if (!state.dependenciesCount) {
            computedObservable.dispose();
        }
    },
    evaluateImmediate_CallReadWithDependencyDetection: function (notifyChange) {
        // This function is really just part of the evaluateImmediate logic. You would never call it from anywhere else.
        // Factoring it out into a separate function means it can be independent of the try/catch block in evaluateImmediate,
        // which contributes to saving about 40% off the CPU overhead of computed evaluation (on V8 at least).

        var computedObservable = this,
            state = computedObservable[computedState];

        // Initially, we assume that none of the subscriptions are still being used (i.e., all are candidates for disposal).
        // Then, during evaluation, we cross off any that are in fact still being used.
        var isInitial = state.pure ? undefined : !state.dependenciesCount,   // If we're evaluating when there are no previous dependencies, it must be the first time
            dependencyDetectionContext = {
                computedObservable: computedObservable,
                disposalCandidates: state.dependencyTracking,
                disposalCount: state.dependenciesCount
            };

        ko.dependencyDetection.begin({
            callbackTarget: dependencyDetectionContext,
            callback: computedBeginDependencyDetectionCallback,
            computed: computedObservable,
            isInitial: isInitial
        });

        state.dependencyTracking = {};
        state.dependenciesCount = 0;

        var newValue = this.evaluateImmediate_CallReadThenEndDependencyDetection(state, dependencyDetectionContext);

        if (computedObservable.isDifferent(state.latestValue, newValue)) {
            if (!state.isSleeping) {
                computedObservable["notifySubscribers"](state.latestValue, "beforeChange");
            }

            state.latestValue = newValue;

            if (state.isSleeping) {
                computedObservable.updateVersion();
            } else if (notifyChange) {
                computedObservable["notifySubscribers"](state.latestValue);
            }
        }

        if (isInitial) {
            computedObservable["notifySubscribers"](state.latestValue, "awake");
        }
    },
    evaluateImmediate_CallReadThenEndDependencyDetection: function (state, dependencyDetectionContext) {
        // This function is really part of the evaluateImmediate_CallReadWithDependencyDetection logic.
        // You'd never call it from anywhere else. Factoring it out means that evaluateImmediate_CallReadWithDependencyDetection
        // can be independent of try/finally blocks, which contributes to saving about 40% off the CPU
        // overhead of computed evaluation (on V8 at least).

        try {
            var readFunction = state.readFunction;
            return state.evaluatorFunctionTarget ? readFunction.call(state.evaluatorFunctionTarget) : readFunction();
        } finally {
            ko.dependencyDetection.end();

            // For each subscription no longer being used, remove it from the active subscriptions list and dispose it
            if (dependencyDetectionContext.disposalCount && !state.isSleeping) {
                ko.utils.objectForEach(dependencyDetectionContext.disposalCandidates, computedDisposeDependencyCallback);
            }

            state.isStale = false;
        }
    },
    peek: function () {
        // Peek won't re-evaluate, except while the computed is sleeping or to get the initial value when "deferEvaluation" is set.
        var state = this[computedState];
        if ((state.isStale && !state.dependenciesCount) || (state.isSleeping && this.haveDependenciesChanged())) {
            this.evaluateImmediate();
        }
        return state.latestValue;
    },
    limit: function (limitFunction) {
        // Override the limit function with one that delays evaluation as well
        ko.subscribable['fn'].limit.call(this, limitFunction);
        this._evalDelayed = function () {
            this._limitBeforeChange(this[computedState].latestValue);

            this[computedState].isStale = true; // Mark as dirty

            // Pass the observable to the "limit" code, which will access it when
            // it's time to do the notification.
            this._limitChange(this);
        }
    },
    dispose: function () {
        var state = this[computedState];
        if (!state.isSleeping && state.dependencyTracking) {
            ko.utils.objectForEach(state.dependencyTracking, function (id, dependency) {
                if (dependency.dispose)
                    dependency.dispose();
            });
        }
        if (state.disposeWhenNodeIsRemoved && state.domNodeDisposalCallback) {
            ko.utils.domNodeDisposal.removeDisposeCallback(state.disposeWhenNodeIsRemoved, state.domNodeDisposalCallback);
        }
        state.dependencyTracking = null;
        state.dependenciesCount = 0;
        state.isDisposed = true;
        state.isStale = false;
        state.isSleeping = false;
        state.disposeWhenNodeIsRemoved = null;
    }
};

var pureComputedOverrides = {
    beforeSubscriptionAdd: function (event) {
        // If asleep, wake up the computed by subscribing to any dependencies.
        var computedObservable = this,
            state = computedObservable[computedState];
        if (!state.isDisposed && state.isSleeping && event == 'change') {
            state.isSleeping = false;
            if (state.isStale || computedObservable.haveDependenciesChanged()) {
                state.dependencyTracking = null;
                state.dependenciesCount = 0;
                state.isStale = true;
                computedObservable.evaluateImmediate();
            } else {
                // First put the dependencies in order
                var dependeciesOrder = [];
                ko.utils.objectForEach(state.dependencyTracking, function (id, dependency) {
                    dependeciesOrder[dependency._order] = id;
                });
                // Next, subscribe to each one
                ko.utils.arrayForEach(dependeciesOrder, function (id, order) {
                    var dependency = state.dependencyTracking[id],
                        subscription = computedObservable.subscribeToDependency(dependency._target);
                    subscription._order = order;
                    subscription._version = dependency._version;
                    state.dependencyTracking[id] = subscription;
                });
            }
            if (!state.isDisposed) {     // test since evaluating could trigger disposal
                computedObservable["notifySubscribers"](state.latestValue, "awake");
            }
        }
    },
    afterSubscriptionRemove: function (event) {
        var state = this[computedState];
        if (!state.isDisposed && event == 'change' && !this.hasSubscriptionsForEvent('change')) {
            ko.utils.objectForEach(state.dependencyTracking, function (id, dependency) {
                if (dependency.dispose) {
                    state.dependencyTracking[id] = {
                        _target: dependency._target,
                        _order: dependency._order,
                        _version: dependency._version
                    };
                    dependency.dispose();
                }
            });
            state.isSleeping = true;
            this["notifySubscribers"](undefined, "asleep");
        }
    },
    getVersion: function () {
        // Because a pure computed is not automatically updated while it is sleeping, we can't
        // simply return the version number. Instead, we check if any of the dependencies have
        // changed and conditionally re-evaluate the computed observable.
        var state = this[computedState];
        if (state.isSleeping && (state.isStale || this.haveDependenciesChanged())) {
            this.evaluateImmediate();
        }
        return ko.subscribable['fn'].getVersion.call(this);
    }
};

var deferEvaluationOverrides = {
    beforeSubscriptionAdd: function (event) {
        // This will force a computed with deferEvaluation to evaluate when the first subscription is registered.
        if (event == 'change' || event == 'beforeChange') {
            this.peek();
        }
    }
};

// Note that for browsers that don't support proto assignment, the
// inheritance chain is created manually in the ko.computed constructor
if (ko.utils.canSetPrototype) {
    ko.utils.setPrototypeOf(computedFn, ko.subscribable['fn']);
}

// Set the proto chain values for ko.hasPrototype
var protoProp = ko.observable.protoProperty; // == "__ko_proto__"
ko.computed[protoProp] = ko.observable;
computedFn[protoProp] = ko.computed;

ko.isComputed = function (instance) {
    return ko.hasPrototype(instance, ko.computed);
};

ko.isPureComputed = function (instance) {
    return ko.hasPrototype(instance, ko.computed)
        && instance[computedState] && instance[computedState].pure;
};

ko.exportSymbol('computed', ko.computed);
ko.exportSymbol('dependentObservable', ko.computed);    // export ko.dependentObservable for backwards compatibility (1.x)
ko.exportSymbol('isComputed', ko.isComputed);
ko.exportSymbol('isPureComputed', ko.isPureComputed);
ko.exportSymbol('computed.fn', computedFn);
ko.exportProperty(computedFn, 'peek', computedFn.peek);
ko.exportProperty(computedFn, 'dispose', computedFn.dispose);
ko.exportProperty(computedFn, 'isActive', computedFn.isActive);
ko.exportProperty(computedFn, 'getDependenciesCount', computedFn.getDependenciesCount);

ko.pureComputed = function (evaluatorFunctionOrOptions, evaluatorFunctionTarget) {
    if (typeof evaluatorFunctionOrOptions === 'function') {
        return ko.computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget, {'pure':true});
    } else {
        evaluatorFunctionOrOptions = ko.utils.extend({}, evaluatorFunctionOrOptions);   // make a copy of the parameter object
        evaluatorFunctionOrOptions['pure'] = true;
        return ko.computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget);
    }
}
ko.exportSymbol('pureComputed', ko.pureComputed);

(function() {
    var maxNestedObservableDepth = 10; // Escape the (unlikely) pathalogical case where an observable's current value is itself (or similar reference cycle)

    ko.toJS = function(rootObject) {
        if (arguments.length == 0)
            throw new Error("When calling ko.toJS, pass the object you want to convert.");

        // We just unwrap everything at every level in the object graph
        return mapJsObjectGraph(rootObject, function(valueToMap) {
            // Loop because an observable's value might in turn be another observable wrapper
            for (var i = 0; ko.isObservable(valueToMap) && (i < maxNestedObservableDepth); i++)
                valueToMap = valueToMap();
            return valueToMap;
        });
    };

    ko.toJSON = function(rootObject, replacer, space) {     // replacer and space are optional
        var plainJavaScriptObject = ko.toJS(rootObject);
        return ko.utils.stringifyJson(plainJavaScriptObject, replacer, space);
    };

    function mapJsObjectGraph(rootObject, mapInputCallback, visitedObjects) {
        visitedObjects = visitedObjects || new objectLookup();

        rootObject = mapInputCallback(rootObject);
        var canHaveProperties = (typeof rootObject == "object") && (rootObject !== null) && (rootObject !== undefined) && (!(rootObject instanceof RegExp)) && (!(rootObject instanceof Date)) && (!(rootObject instanceof String)) && (!(rootObject instanceof Number)) && (!(rootObject instanceof Boolean));
        if (!canHaveProperties)
            return rootObject;

        var outputProperties = rootObject instanceof Array ? [] : {};
        visitedObjects.save(rootObject, outputProperties);

        visitPropertiesOrArrayEntries(rootObject, function(indexer) {
            var propertyValue = mapInputCallback(rootObject[indexer]);

            switch (typeof propertyValue) {
                case "boolean":
                case "number":
                case "string":
                case "function":
                    outputProperties[indexer] = propertyValue;
                    break;
                case "object":
                case "undefined":
                    var previouslyMappedValue = visitedObjects.get(propertyValue);
                    outputProperties[indexer] = (previouslyMappedValue !== undefined)
                        ? previouslyMappedValue
                        : mapJsObjectGraph(propertyValue, mapInputCallback, visitedObjects);
                    break;
            }
        });

        return outputProperties;
    }

    function visitPropertiesOrArrayEntries(rootObject, visitorCallback) {
        if (rootObject instanceof Array) {
            for (var i = 0; i < rootObject.length; i++)
                visitorCallback(i);

            // For arrays, also respect toJSON property for custom mappings (fixes #278)
            if (typeof rootObject['toJSON'] == 'function')
                visitorCallback('toJSON');
        } else {
            for (var propertyName in rootObject) {
                visitorCallback(propertyName);
            }
        }
    };

    function objectLookup() {
        this.keys = [];
        this.values = [];
    };

    objectLookup.prototype = {
        constructor: objectLookup,
        save: function(key, value) {
            var existingIndex = ko.utils.arrayIndexOf(this.keys, key);
            if (existingIndex >= 0)
                this.values[existingIndex] = value;
            else {
                this.keys.push(key);
                this.values.push(value);
            }
        },
        get: function(key) {
            var existingIndex = ko.utils.arrayIndexOf(this.keys, key);
            return (existingIndex >= 0) ? this.values[existingIndex] : undefined;
        }
    };
})();

ko.exportSymbol('toJS', ko.toJS);
ko.exportSymbol('toJSON', ko.toJSON);
(function () {
    var hasDomDataExpandoProperty = '__ko__hasDomDataOptionValue__';

    // Normally, SELECT elements and their OPTIONs can only take value of type 'string' (because the values
    // are stored on DOM attributes). ko.selectExtensions provides a way for SELECTs/OPTIONs to have values
    // that are arbitrary objects. This is very convenient when implementing things like cascading dropdowns.
    ko.selectExtensions = {
        readValue : function(element) {
            switch (ko.utils.tagNameLower(element)) {
                case 'option':
                    if (element[hasDomDataExpandoProperty] === true)
                        return ko.utils.domData.get(element, ko.bindingHandlers.options.optionValueDomDataKey);
                    return ko.utils.ieVersion <= 7
                        ? (element.getAttributeNode('value') && element.getAttributeNode('value').specified ? element.value : element.text)
                        : element.value;
                case 'select':
                    return element.selectedIndex >= 0 ? ko.selectExtensions.readValue(element.options[element.selectedIndex]) : undefined;
                default:
                    return element.value;
            }
        },

        writeValue: function(element, value, allowUnset) {
            switch (ko.utils.tagNameLower(element)) {
                case 'option':
                    switch(typeof value) {
                        case "string":
                            ko.utils.domData.set(element, ko.bindingHandlers.options.optionValueDomDataKey, undefined);
                            if (hasDomDataExpandoProperty in element) { // IE <= 8 throws errors if you delete non-existent properties from a DOM node
                                delete element[hasDomDataExpandoProperty];
                            }
                            element.value = value;
                            break;
                        default:
                            // Store arbitrary object using DomData
                            ko.utils.domData.set(element, ko.bindingHandlers.options.optionValueDomDataKey, value);
                            element[hasDomDataExpandoProperty] = true;

                            // Special treatment of numbers is just for backward compatibility. KO 1.2.1 wrote numerical values to element.value.
                            element.value = typeof value === "number" ? value : "";
                            break;
                    }
                    break;
                case 'select':
                    if (value === "" || value === null)       // A blank string or null value will select the caption
                        value = undefined;
                    var selection = -1;
                    for (var i = 0, n = element.options.length, optionValue; i < n; ++i) {
                        optionValue = ko.selectExtensions.readValue(element.options[i]);
                        // Include special check to handle selecting a caption with a blank string value
                        if (optionValue == value || (optionValue == "" && value === undefined)) {
                            selection = i;
                            break;
                        }
                    }
                    if (allowUnset || selection >= 0 || (value === undefined && element.size > 1)) {
                        element.selectedIndex = selection;
                    }
                    break;
                default:
                    if ((value === null) || (value === undefined))
                        value = "";
                    element.value = value;
                    break;
            }
        }
    };
})();

ko.exportSymbol('selectExtensions', ko.selectExtensions);
ko.exportSymbol('selectExtensions.readValue', ko.selectExtensions.readValue);
ko.exportSymbol('selectExtensions.writeValue', ko.selectExtensions.writeValue);
ko.expressionRewriting = (function () {
    var javaScriptReservedWords = ["true", "false", "null", "undefined"];

    // Matches something that can be assigned to--either an isolated identifier or something ending with a property accessor
    // This is designed to be simple and avoid false negatives, but could produce false positives (e.g., a+b.c).
    // This also will not properly handle nested brackets (e.g., obj1[obj2['prop']]; see #911).
    var javaScriptAssignmentTarget = /^(?:[$_a-z][$\w]*|(.+)(\.\s*[$_a-z][$\w]*|\[.+\]))$/i;

    function getWriteableValue(expression) {
        if (ko.utils.arrayIndexOf(javaScriptReservedWords, expression) >= 0)
            return false;
        var match = expression.match(javaScriptAssignmentTarget);
        return match === null ? false : match[1] ? ('Object(' + match[1] + ')' + match[2]) : expression;
    }

    // The following regular expressions will be used to split an object-literal string into tokens

        // These two match strings, either with double quotes or single quotes
    var stringDouble = '"(?:[^"\\\\]|\\\\.)*"',
        stringSingle = "'(?:[^'\\\\]|\\\\.)*'",
        // Matches a regular expression (text enclosed by slashes), but will also match sets of divisions
        // as a regular expression (this is handled by the parsing loop below).
        stringRegexp = '/(?:[^/\\\\]|\\\\.)*/\w*',
        // These characters have special meaning to the parser and must not appear in the middle of a
        // token, except as part of a string.
        specials = ',"\'{}()/:[\\]',
        // Match text (at least two characters) that does not contain any of the above special characters,
        // although some of the special characters are allowed to start it (all but the colon and comma).
        // The text can contain spaces, but leading or trailing spaces are skipped.
        everyThingElse = '[^\\s:,/][^' + specials + ']*[^\\s' + specials + ']',
        // Match any non-space character not matched already. This will match colons and commas, since they're
        // not matched by "everyThingElse", but will also match any other single character that wasn't already
        // matched (for example: in "a: 1, b: 2", each of the non-space characters will be matched by oneNotSpace).
        oneNotSpace = '[^\\s]',

        // Create the actual regular expression by or-ing the above strings. The order is important.
        bindingToken = RegExp(stringDouble + '|' + stringSingle + '|' + stringRegexp + '|' + everyThingElse + '|' + oneNotSpace, 'g'),

        // Match end of previous token to determine whether a slash is a division or regex.
        divisionLookBehind = /[\])"'A-Za-z0-9_$]+$/,
        keywordRegexLookBehind = {'in':1,'return':1,'typeof':1};

    function parseObjectLiteral(objectLiteralString) {
        // Trim leading and trailing spaces from the string
        var str = ko.utils.stringTrim(objectLiteralString);

        // Trim braces '{' surrounding the whole object literal
        if (str.charCodeAt(0) === 123) str = str.slice(1, -1);

        // Split into tokens
        var result = [], toks = str.match(bindingToken), key, values = [], depth = 0;

        if (toks) {
            // Append a comma so that we don't need a separate code block to deal with the last item
            toks.push(',');

            for (var i = 0, tok; tok = toks[i]; ++i) {
                var c = tok.charCodeAt(0);
                // A comma signals the end of a key/value pair if depth is zero
                if (c === 44) { // ","
                    if (depth <= 0) {
                        result.push((key && values.length) ? {key: key, value: values.join('')} : {'unknown': key || values.join('')});
                        key = depth = 0;
                        values = [];
                        continue;
                    }
                // Simply skip the colon that separates the name and value
                } else if (c === 58) { // ":"
                    if (!depth && !key && values.length === 1) {
                        key = values.pop();
                        continue;
                    }
                // A set of slashes is initially matched as a regular expression, but could be division
                } else if (c === 47 && i && tok.length > 1) {  // "/"
                    // Look at the end of the previous token to determine if the slash is actually division
                    var match = toks[i-1].match(divisionLookBehind);
                    if (match && !keywordRegexLookBehind[match[0]]) {
                        // The slash is actually a division punctuator; re-parse the remainder of the string (not including the slash)
                        str = str.substr(str.indexOf(tok) + 1);
                        toks = str.match(bindingToken);
                        toks.push(',');
                        i = -1;
                        // Continue with just the slash
                        tok = '/';
                    }
                // Increment depth for parentheses, braces, and brackets so that interior commas are ignored
                } else if (c === 40 || c === 123 || c === 91) { // '(', '{', '['
                    ++depth;
                } else if (c === 41 || c === 125 || c === 93) { // ')', '}', ']'
                    --depth;
                // The key will be the first token; if it's a string, trim the quotes
                } else if (!key && !values.length && (c === 34 || c === 39)) { // '"', "'"
                    tok = tok.slice(1, -1);
                }
                values.push(tok);
            }
        }
        return result;
    }

    // Two-way bindings include a write function that allow the handler to update the value even if it's not an observable.
    var twoWayBindings = {};

    function preProcessBindings(bindingsStringOrKeyValueArray, bindingOptions) {
        bindingOptions = bindingOptions || {};

        function processKeyValue(key, val) {
            var writableVal;
            function callPreprocessHook(obj) {
                return (obj && obj['preprocess']) ? (val = obj['preprocess'](val, key, processKeyValue)) : true;
            }
            if (!bindingParams) {
                if (!callPreprocessHook(ko['getBindingHandler'](key)))
                    return;

                if (twoWayBindings[key] && (writableVal = getWriteableValue(val))) {
                    // For two-way bindings, provide a write method in case the value
                    // isn't a writable observable.
                    propertyAccessorResultStrings.push("'" + key + "':function(_z){" + writableVal + "=_z}");
                }
            }
            // Values are wrapped in a function so that each value can be accessed independently
            if (makeValueAccessors) {
                val = 'function(){return ' + val + ' }';
            }
            resultStrings.push("'" + key + "':" + val);
        }

        var resultStrings = [],
            propertyAccessorResultStrings = [],
            makeValueAccessors = bindingOptions['valueAccessors'],
            bindingParams = bindingOptions['bindingParams'],
            keyValueArray = typeof bindingsStringOrKeyValueArray === "string" ?
                parseObjectLiteral(bindingsStringOrKeyValueArray) : bindingsStringOrKeyValueArray;

        ko.utils.arrayForEach(keyValueArray, function(keyValue) {
            processKeyValue(keyValue.key || keyValue['unknown'], keyValue.value);
        });

        if (propertyAccessorResultStrings.length)
            processKeyValue('_ko_property_writers', "{" + propertyAccessorResultStrings.join(",") + " }");

        return resultStrings.join(",");
    }

    return {
        bindingRewriteValidators: [],

        twoWayBindings: twoWayBindings,

        parseObjectLiteral: parseObjectLiteral,

        preProcessBindings: preProcessBindings,

        keyValueArrayContainsKey: function(keyValueArray, key) {
            for (var i = 0; i < keyValueArray.length; i++)
                if (keyValueArray[i]['key'] == key)
                    return true;
            return false;
        },

        // Internal, private KO utility for updating model properties from within bindings
        // property:            If the property being updated is (or might be) an observable, pass it here
        //                      If it turns out to be a writable observable, it will be written to directly
        // allBindings:         An object with a get method to retrieve bindings in the current execution context.
        //                      This will be searched for a '_ko_property_writers' property in case you're writing to a non-observable
        // key:                 The key identifying the property to be written. Example: for { hasFocus: myValue }, write to 'myValue' by specifying the key 'hasFocus'
        // value:               The value to be written
        // checkIfDifferent:    If true, and if the property being written is a writable observable, the value will only be written if
        //                      it is !== existing value on that writable observable
        writeValueToProperty: function(property, allBindings, key, value, checkIfDifferent) {
            if (!property || !ko.isObservable(property)) {
                var propWriters = allBindings.get('_ko_property_writers');
                if (propWriters && propWriters[key])
                    propWriters[key](value);
            } else if (ko.isWriteableObservable(property) && (!checkIfDifferent || property.peek() !== value)) {
                property(value);
            }
        }
    };
})();

ko.exportSymbol('expressionRewriting', ko.expressionRewriting);
ko.exportSymbol('expressionRewriting.bindingRewriteValidators', ko.expressionRewriting.bindingRewriteValidators);
ko.exportSymbol('expressionRewriting.parseObjectLiteral', ko.expressionRewriting.parseObjectLiteral);
ko.exportSymbol('expressionRewriting.preProcessBindings', ko.expressionRewriting.preProcessBindings);

// Making bindings explicitly declare themselves as "two way" isn't ideal in the long term (it would be better if
// all bindings could use an official 'property writer' API without needing to declare that they might). However,
// since this is not, and has never been, a public API (_ko_property_writers was never documented), it's acceptable
// as an internal implementation detail in the short term.
// For those developers who rely on _ko_property_writers in their custom bindings, we expose _twoWayBindings as an
// undocumented feature that makes it relatively easy to upgrade to KO 3.0. However, this is still not an official
// public API, and we reserve the right to remove it at any time if we create a real public property writers API.
ko.exportSymbol('expressionRewriting._twoWayBindings', ko.expressionRewriting.twoWayBindings);

// For backward compatibility, define the following aliases. (Previously, these function names were misleading because
// they referred to JSON specifically, even though they actually work with arbitrary JavaScript object literal expressions.)
ko.exportSymbol('jsonExpressionRewriting', ko.expressionRewriting);
ko.exportSymbol('jsonExpressionRewriting.insertPropertyAccessorsIntoJson', ko.expressionRewriting.preProcessBindings);
(function() {
    // "Virtual elements" is an abstraction on top of the usual DOM API which understands the notion that comment nodes
    // may be used to represent hierarchy (in addition to the DOM's natural hierarchy).
    // If you call the DOM-manipulating functions on ko.virtualElements, you will be able to read and write the state
    // of that virtual hierarchy
    //
    // The point of all this is to support containerless templates (e.g., <!-- ko foreach:someCollection -->blah<!-- /ko -->)
    // without having to scatter special cases all over the binding and templating code.

    // IE 9 cannot reliably read the "nodeValue" property of a comment node (see https://github.com/SteveSanderson/knockout/issues/186)
    // but it does give them a nonstandard alternative property called "text" that it can read reliably. Other browsers don't have that property.
    // So, use node.text where available, and node.nodeValue elsewhere
    var commentNodesHaveTextProperty = document && document.createComment("test").text === "<!--test-->";

    var startCommentRegex = commentNodesHaveTextProperty ? /^<!--\s*ko(?:\s+([\s\S]+))?\s*-->$/ : /^\s*ko(?:\s+([\s\S]+))?\s*$/;
    var endCommentRegex =   commentNodesHaveTextProperty ? /^<!--\s*\/ko\s*-->$/ : /^\s*\/ko\s*$/;
    var htmlTagsWithOptionallyClosingChildren = { 'ul': true, 'ol': true };

    function isStartComment(node) {
        return (node.nodeType == 8) && startCommentRegex.test(commentNodesHaveTextProperty ? node.text : node.nodeValue);
    }

    function isEndComment(node) {
        return (node.nodeType == 8) && endCommentRegex.test(commentNodesHaveTextProperty ? node.text : node.nodeValue);
    }

    function getVirtualChildren(startComment, allowUnbalanced) {
        var currentNode = startComment;
        var depth = 1;
        var children = [];
        while (currentNode = currentNode.nextSibling) {
            if (isEndComment(currentNode)) {
                depth--;
                if (depth === 0)
                    return children;
            }

            children.push(currentNode);

            if (isStartComment(currentNode))
                depth++;
        }
        if (!allowUnbalanced)
            throw new Error("Cannot find closing comment tag to match: " + startComment.nodeValue);
        return null;
    }

    function getMatchingEndComment(startComment, allowUnbalanced) {
        var allVirtualChildren = getVirtualChildren(startComment, allowUnbalanced);
        if (allVirtualChildren) {
            if (allVirtualChildren.length > 0)
                return allVirtualChildren[allVirtualChildren.length - 1].nextSibling;
            return startComment.nextSibling;
        } else
            return null; // Must have no matching end comment, and allowUnbalanced is true
    }

    function getUnbalancedChildTags(node) {
        // e.g., from <div>OK</div><!-- ko blah --><span>Another</span>, returns: <!-- ko blah --><span>Another</span>
        //       from <div>OK</div><!-- /ko --><!-- /ko -->,             returns: <!-- /ko --><!-- /ko -->
        var childNode = node.firstChild, captureRemaining = null;
        if (childNode) {
            do {
                if (captureRemaining)                   // We already hit an unbalanced node and are now just scooping up all subsequent nodes
                    captureRemaining.push(childNode);
                else if (isStartComment(childNode)) {
                    var matchingEndComment = getMatchingEndComment(childNode, /* allowUnbalanced: */ true);
                    if (matchingEndComment)             // It's a balanced tag, so skip immediately to the end of this virtual set
                        childNode = matchingEndComment;
                    else
                        captureRemaining = [childNode]; // It's unbalanced, so start capturing from this point
                } else if (isEndComment(childNode)) {
                    captureRemaining = [childNode];     // It's unbalanced (if it wasn't, we'd have skipped over it already), so start capturing
                }
            } while (childNode = childNode.nextSibling);
        }
        return captureRemaining;
    }

    ko.virtualElements = {
        allowedBindings: {},

        childNodes: function(node) {
            return isStartComment(node) ? getVirtualChildren(node) : node.childNodes;
        },

        emptyNode: function(node) {
            if (!isStartComment(node))
                ko.utils.emptyDomNode(node);
            else {
                var virtualChildren = ko.virtualElements.childNodes(node);
                for (var i = 0, j = virtualChildren.length; i < j; i++)
                    ko.removeNode(virtualChildren[i]);
            }
        },

        setDomNodeChildren: function(node, childNodes) {
            if (!isStartComment(node))
                ko.utils.setDomNodeChildren(node, childNodes);
            else {
                ko.virtualElements.emptyNode(node);
                var endCommentNode = node.nextSibling; // Must be the next sibling, as we just emptied the children
                for (var i = 0, j = childNodes.length; i < j; i++)
                    endCommentNode.parentNode.insertBefore(childNodes[i], endCommentNode);
            }
        },

        prepend: function(containerNode, nodeToPrepend) {
            if (!isStartComment(containerNode)) {
                if (containerNode.firstChild)
                    containerNode.insertBefore(nodeToPrepend, containerNode.firstChild);
                else
                    containerNode.appendChild(nodeToPrepend);
            } else {
                // Start comments must always have a parent and at least one following sibling (the end comment)
                containerNode.parentNode.insertBefore(nodeToPrepend, containerNode.nextSibling);
            }
        },

        insertAfter: function(containerNode, nodeToInsert, insertAfterNode) {
            if (!insertAfterNode) {
                ko.virtualElements.prepend(containerNode, nodeToInsert);
            } else if (!isStartComment(containerNode)) {
                // Insert after insertion point
                if (insertAfterNode.nextSibling)
                    containerNode.insertBefore(nodeToInsert, insertAfterNode.nextSibling);
                else
                    containerNode.appendChild(nodeToInsert);
            } else {
                // Children of start comments must always have a parent and at least one following sibling (the end comment)
                containerNode.parentNode.insertBefore(nodeToInsert, insertAfterNode.nextSibling);
            }
        },

        firstChild: function(node) {
            if (!isStartComment(node))
                return node.firstChild;
            if (!node.nextSibling || isEndComment(node.nextSibling))
                return null;
            return node.nextSibling;
        },

        nextSibling: function(node) {
            if (isStartComment(node))
                node = getMatchingEndComment(node);
            if (node.nextSibling && isEndComment(node.nextSibling))
                return null;
            return node.nextSibling;
        },

        hasBindingValue: isStartComment,

        virtualNodeBindingValue: function(node) {
            var regexMatch = (commentNodesHaveTextProperty ? node.text : node.nodeValue).match(startCommentRegex);
            return regexMatch ? regexMatch[1] : null;
        },

        normaliseVirtualElementDomStructure: function(elementVerified) {
            // Workaround for https://github.com/SteveSanderson/knockout/issues/155
            // (IE <= 8 or IE 9 quirks mode parses your HTML weirdly, treating closing </li> tags as if they don't exist, thereby moving comment nodes
            // that are direct descendants of <ul> into the preceding <li>)
            if (!htmlTagsWithOptionallyClosingChildren[ko.utils.tagNameLower(elementVerified)])
                return;

            // Scan immediate children to see if they contain unbalanced comment tags. If they do, those comment tags
            // must be intended to appear *after* that child, so move them there.
            var childNode = elementVerified.firstChild;
            if (childNode) {
                do {
                    if (childNode.nodeType === 1) {
                        var unbalancedTags = getUnbalancedChildTags(childNode);
                        if (unbalancedTags) {
                            // Fix up the DOM by moving the unbalanced tags to where they most likely were intended to be placed - *after* the child
                            var nodeToInsertBefore = childNode.nextSibling;
                            for (var i = 0; i < unbalancedTags.length; i++) {
                                if (nodeToInsertBefore)
                                    elementVerified.insertBefore(unbalancedTags[i], nodeToInsertBefore);
                                else
                                    elementVerified.appendChild(unbalancedTags[i]);
                            }
                        }
                    }
                } while (childNode = childNode.nextSibling);
            }
        }
    };
})();
ko.exportSymbol('virtualElements', ko.virtualElements);
ko.exportSymbol('virtualElements.allowedBindings', ko.virtualElements.allowedBindings);
ko.exportSymbol('virtualElements.emptyNode', ko.virtualElements.emptyNode);
//ko.exportSymbol('virtualElements.firstChild', ko.virtualElements.firstChild);     // firstChild is not minified
ko.exportSymbol('virtualElements.insertAfter', ko.virtualElements.insertAfter);
//ko.exportSymbol('virtualElements.nextSibling', ko.virtualElements.nextSibling);   // nextSibling is not minified
ko.exportSymbol('virtualElements.prepend', ko.virtualElements.prepend);
ko.exportSymbol('virtualElements.setDomNodeChildren', ko.virtualElements.setDomNodeChildren);
(function() {
    var defaultBindingAttributeName = "data-bind";

    ko.bindingProvider = function() {
        this.bindingCache = {};
    };

    ko.utils.extend(ko.bindingProvider.prototype, {
        'nodeHasBindings': function(node) {
            switch (node.nodeType) {
                case 1: // Element
                    return node.getAttribute(defaultBindingAttributeName) != null
                        || ko.components['getComponentNameForNode'](node);
                case 8: // Comment node
                    return ko.virtualElements.hasBindingValue(node);
                default: return false;
            }
        },

        'getBindings': function(node, bindingContext) {
            var bindingsString = this['getBindingsString'](node, bindingContext),
                parsedBindings = bindingsString ? this['parseBindingsString'](bindingsString, bindingContext, node) : null;
            return ko.components.addBindingsForCustomElement(parsedBindings, node, bindingContext, /* valueAccessors */ false);
        },

        'getBindingAccessors': function(node, bindingContext) {
            var bindingsString = this['getBindingsString'](node, bindingContext),
                parsedBindings = bindingsString ? this['parseBindingsString'](bindingsString, bindingContext, node, { 'valueAccessors': true }) : null;
            return ko.components.addBindingsForCustomElement(parsedBindings, node, bindingContext, /* valueAccessors */ true);
        },

        // The following function is only used internally by this default provider.
        // It's not part of the interface definition for a general binding provider.
        'getBindingsString': function(node, bindingContext) {
            switch (node.nodeType) {
                case 1: return node.getAttribute(defaultBindingAttributeName);   // Element
                case 8: return ko.virtualElements.virtualNodeBindingValue(node); // Comment node
                default: return null;
            }
        },

        // The following function is only used internally by this default provider.
        // It's not part of the interface definition for a general binding provider.
        'parseBindingsString': function(bindingsString, bindingContext, node, options) {
            try {
                var bindingFunction = createBindingsStringEvaluatorViaCache(bindingsString, this.bindingCache, options);
                return bindingFunction(bindingContext, node);
            } catch (ex) {
                ex.message = "Unable to parse bindings.\nBindings value: " + bindingsString + "\nMessage: " + ex.message;
                throw ex;
            }
        }
    });

    ko.bindingProvider['instance'] = new ko.bindingProvider();

    function createBindingsStringEvaluatorViaCache(bindingsString, cache, options) {
        var cacheKey = bindingsString + (options && options['valueAccessors'] || '');
        return cache[cacheKey]
            || (cache[cacheKey] = createBindingsStringEvaluator(bindingsString, options));
    }

    function createBindingsStringEvaluator(bindingsString, options) {
        // Build the source for a function that evaluates "expression"
        // For each scope variable, add an extra level of "with" nesting
        // Example result: with(sc1) { with(sc0) { return (expression) } }
        var rewrittenBindings = ko.expressionRewriting.preProcessBindings(bindingsString, options),
            functionBody = "with($context){with($data||{}){return{" + rewrittenBindings + "}}}";
        return new Function("$context", "$element", functionBody);
    }
})();

ko.exportSymbol('bindingProvider', ko.bindingProvider);
(function () {
    ko.bindingHandlers = {};

    // The following element types will not be recursed into during binding.
    var bindingDoesNotRecurseIntoElementTypes = {
        // Don't want bindings that operate on text nodes to mutate <script> and <textarea> contents,
        // because it's unexpected and a potential XSS issue.
        // Also bindings should not operate on <template> elements since this breaks in Internet Explorer
        // and because such elements' contents are always intended to be bound in a different context
        // from where they appear in the document.
        'script': true,
        'textarea': true,
        'template': true
    };

    // Use an overridable method for retrieving binding handlers so that a plugins may support dynamically created handlers
    ko['getBindingHandler'] = function(bindingKey) {
        return ko.bindingHandlers[bindingKey];
    };

    // The ko.bindingContext constructor is only called directly to create the root context. For child
    // contexts, use bindingContext.createChildContext or bindingContext.extend.
    ko.bindingContext = function(dataItemOrAccessor, parentContext, dataItemAlias, extendCallback) {

        // The binding context object includes static properties for the current, parent, and root view models.
        // If a view model is actually stored in an observable, the corresponding binding context object, and
        // any child contexts, must be updated when the view model is changed.
        function updateContext() {
            // Most of the time, the context will directly get a view model object, but if a function is given,
            // we call the function to retrieve the view model. If the function accesses any observables or returns
            // an observable, the dependency is tracked, and those observables can later cause the binding
            // context to be updated.
            var dataItemOrObservable = isFunc ? dataItemOrAccessor() : dataItemOrAccessor,
                dataItem = ko.utils.unwrapObservable(dataItemOrObservable);

            if (parentContext) {
                // When a "parent" context is given, register a dependency on the parent context. Thus whenever the
                // parent context is updated, this context will also be updated.
                if (parentContext._subscribable)
                    parentContext._subscribable();

                // Copy $root and any custom properties from the parent context
                ko.utils.extend(self, parentContext);

                // Because the above copy overwrites our own properties, we need to reset them.
                // During the first execution, "subscribable" isn't set, so don't bother doing the update then.
                if (subscribable) {
                    self._subscribable = subscribable;
                }
            } else {
                self['$parents'] = [];
                self['$root'] = dataItem;

                // Export 'ko' in the binding context so it will be available in bindings and templates
                // even if 'ko' isn't exported as a global, such as when using an AMD loader.
                // See https://github.com/SteveSanderson/knockout/issues/490
                self['ko'] = ko;
            }
            self['$rawData'] = dataItemOrObservable;
            self['$data'] = dataItem;
            if (dataItemAlias)
                self[dataItemAlias] = dataItem;

            // The extendCallback function is provided when creating a child context or extending a context.
            // It handles the specific actions needed to finish setting up the binding context. Actions in this
            // function could also add dependencies to this binding context.
            if (extendCallback)
                extendCallback(self, parentContext, dataItem);

            return self['$data'];
        }
        function disposeWhen() {
            return nodes && !ko.utils.anyDomNodeIsAttachedToDocument(nodes);
        }

        var self = this,
            isFunc = typeof(dataItemOrAccessor) == "function" && !ko.isObservable(dataItemOrAccessor),
            nodes,
            subscribable = ko.dependentObservable(updateContext, null, { disposeWhen: disposeWhen, disposeWhenNodeIsRemoved: true });

        // At this point, the binding context has been initialized, and the "subscribable" computed observable is
        // subscribed to any observables that were accessed in the process. If there is nothing to track, the
        // computed will be inactive, and we can safely throw it away. If it's active, the computed is stored in
        // the context object.
        if (subscribable.isActive()) {
            self._subscribable = subscribable;

            // Always notify because even if the model ($data) hasn't changed, other context properties might have changed
            subscribable['equalityComparer'] = null;

            // We need to be able to dispose of this computed observable when it's no longer needed. This would be
            // easy if we had a single node to watch, but binding contexts can be used by many different nodes, and
            // we cannot assume that those nodes have any relation to each other. So instead we track any node that
            // the context is attached to, and dispose the computed when all of those nodes have been cleaned.

            // Add properties to *subscribable* instead of *self* because any properties added to *self* may be overwritten on updates
            nodes = [];
            subscribable._addNode = function(node) {
                nodes.push(node);
                ko.utils.domNodeDisposal.addDisposeCallback(node, function(node) {
                    ko.utils.arrayRemoveItem(nodes, node);
                    if (!nodes.length) {
                        subscribable.dispose();
                        self._subscribable = subscribable = undefined;
                    }
                });
            };
        }
    }

    // Extend the binding context hierarchy with a new view model object. If the parent context is watching
    // any observables, the new child context will automatically get a dependency on the parent context.
    // But this does not mean that the $data value of the child context will also get updated. If the child
    // view model also depends on the parent view model, you must provide a function that returns the correct
    // view model on each update.
    ko.bindingContext.prototype['createChildContext'] = function (dataItemOrAccessor, dataItemAlias, extendCallback) {
        return new ko.bindingContext(dataItemOrAccessor, this, dataItemAlias, function(self, parentContext) {
            // Extend the context hierarchy by setting the appropriate pointers
            self['$parentContext'] = parentContext;
            self['$parent'] = parentContext['$data'];
            self['$parents'] = (parentContext['$parents'] || []).slice(0);
            self['$parents'].unshift(self['$parent']);
            if (extendCallback)
                extendCallback(self);
        });
    };

    // Extend the binding context with new custom properties. This doesn't change the context hierarchy.
    // Similarly to "child" contexts, provide a function here to make sure that the correct values are set
    // when an observable view model is updated.
    ko.bindingContext.prototype['extend'] = function(properties) {
        // If the parent context references an observable view model, "_subscribable" will always be the
        // latest view model object. If not, "_subscribable" isn't set, and we can use the static "$data" value.
        return new ko.bindingContext(this._subscribable || this['$data'], this, null, function(self, parentContext) {
            // This "child" context doesn't directly track a parent observable view model,
            // so we need to manually set the $rawData value to match the parent.
            self['$rawData'] = parentContext['$rawData'];
            ko.utils.extend(self, typeof(properties) == "function" ? properties() : properties);
        });
    };

    // Returns the valueAccesor function for a binding value
    function makeValueAccessor(value) {
        return function() {
            return value;
        };
    }

    // Returns the value of a valueAccessor function
    function evaluateValueAccessor(valueAccessor) {
        return valueAccessor();
    }

    // Given a function that returns bindings, create and return a new object that contains
    // binding value-accessors functions. Each accessor function calls the original function
    // so that it always gets the latest value and all dependencies are captured. This is used
    // by ko.applyBindingsToNode and getBindingsAndMakeAccessors.
    function makeAccessorsFromFunction(callback) {
        return ko.utils.objectMap(ko.dependencyDetection.ignore(callback), function(value, key) {
            return function() {
                return callback()[key];
            };
        });
    }

    // Given a bindings function or object, create and return a new object that contains
    // binding value-accessors functions. This is used by ko.applyBindingsToNode.
    function makeBindingAccessors(bindings, context, node) {
        if (typeof bindings === 'function') {
            return makeAccessorsFromFunction(bindings.bind(null, context, node));
        } else {
            return ko.utils.objectMap(bindings, makeValueAccessor);
        }
    }

    // This function is used if the binding provider doesn't include a getBindingAccessors function.
    // It must be called with 'this' set to the provider instance.
    function getBindingsAndMakeAccessors(node, context) {
        return makeAccessorsFromFunction(this['getBindings'].bind(this, node, context));
    }

    function validateThatBindingIsAllowedForVirtualElements(bindingName) {
        var validator = ko.virtualElements.allowedBindings[bindingName];
        if (!validator)
            throw new Error("The binding '" + bindingName + "' cannot be used with virtual elements")
    }

    function applyBindingsToDescendantsInternal (bindingContext, elementOrVirtualElement, bindingContextsMayDifferFromDomParentElement) {
        var currentChild,
            nextInQueue = ko.virtualElements.firstChild(elementOrVirtualElement),
            provider = ko.bindingProvider['instance'],
            preprocessNode = provider['preprocessNode'];

        // Preprocessing allows a binding provider to mutate a node before bindings are applied to it. For example it's
        // possible to insert new siblings after it, and/or replace the node with a different one. This can be used to
        // implement custom binding syntaxes, such as {{ value }} for string interpolation, or custom element types that
        // trigger insertion of <template> contents at that point in the document.
        if (preprocessNode) {
            while (currentChild = nextInQueue) {
                nextInQueue = ko.virtualElements.nextSibling(currentChild);
                preprocessNode.call(provider, currentChild);
            }
            // Reset nextInQueue for the next loop
            nextInQueue = ko.virtualElements.firstChild(elementOrVirtualElement);
        }

        while (currentChild = nextInQueue) {
            // Keep a record of the next child *before* applying bindings, in case the binding removes the current child from its position
            nextInQueue = ko.virtualElements.nextSibling(currentChild);
            applyBindingsToNodeAndDescendantsInternal(bindingContext, currentChild, bindingContextsMayDifferFromDomParentElement);
        }
    }

    function applyBindingsToNodeAndDescendantsInternal (bindingContext, nodeVerified, bindingContextMayDifferFromDomParentElement) {
        var shouldBindDescendants = true;

        // Perf optimisation: Apply bindings only if...
        // (1) We need to store the binding context on this node (because it may differ from the DOM parent node's binding context)
        //     Note that we can't store binding contexts on non-elements (e.g., text nodes), as IE doesn't allow expando properties for those
        // (2) It might have bindings (e.g., it has a data-bind attribute, or it's a marker for a containerless template)
        var isElement = (nodeVerified.nodeType === 1);
        if (isElement) // Workaround IE <= 8 HTML parsing weirdness
            ko.virtualElements.normaliseVirtualElementDomStructure(nodeVerified);

        var shouldApplyBindings = (isElement && bindingContextMayDifferFromDomParentElement)             // Case (1)
                               || ko.bindingProvider['instance']['nodeHasBindings'](nodeVerified);       // Case (2)
        if (shouldApplyBindings)
            shouldBindDescendants = applyBindingsToNodeInternal(nodeVerified, null, bindingContext, bindingContextMayDifferFromDomParentElement)['shouldBindDescendants'];

        if (shouldBindDescendants && !bindingDoesNotRecurseIntoElementTypes[ko.utils.tagNameLower(nodeVerified)]) {
            // We're recursing automatically into (real or virtual) child nodes without changing binding contexts. So,
            //  * For children of a *real* element, the binding context is certainly the same as on their DOM .parentNode,
            //    hence bindingContextsMayDifferFromDomParentElement is false
            //  * For children of a *virtual* element, we can't be sure. Evaluating .parentNode on those children may
            //    skip over any number of intermediate virtual elements, any of which might define a custom binding context,
            //    hence bindingContextsMayDifferFromDomParentElement is true
            applyBindingsToDescendantsInternal(bindingContext, nodeVerified, /* bindingContextsMayDifferFromDomParentElement: */ !isElement);
        }
    }

    var boundElementDomDataKey = ko.utils.domData.nextKey();


    function topologicalSortBindings(bindings) {
        // Depth-first sort
        var result = [],                // The list of key/handler pairs that we will return
            bindingsConsidered = {},    // A temporary record of which bindings are already in 'result'
            cyclicDependencyStack = []; // Keeps track of a depth-search so that, if there's a cycle, we know which bindings caused it
        ko.utils.objectForEach(bindings, function pushBinding(bindingKey) {
            if (!bindingsConsidered[bindingKey]) {
                var binding = ko['getBindingHandler'](bindingKey);
                if (binding) {
                    // First add dependencies (if any) of the current binding
                    if (binding['after']) {
                        cyclicDependencyStack.push(bindingKey);
                        ko.utils.arrayForEach(binding['after'], function(bindingDependencyKey) {
                            if (bindings[bindingDependencyKey]) {
                                if (ko.utils.arrayIndexOf(cyclicDependencyStack, bindingDependencyKey) !== -1) {
                                    throw Error("Cannot combine the following bindings, because they have a cyclic dependency: " + cyclicDependencyStack.join(", "));
                                } else {
                                    pushBinding(bindingDependencyKey);
                                }
                            }
                        });
                        cyclicDependencyStack.length--;
                    }
                    // Next add the current binding
                    result.push({ key: bindingKey, handler: binding });
                }
                bindingsConsidered[bindingKey] = true;
            }
        });

        return result;
    }

    function applyBindingsToNodeInternal(node, sourceBindings, bindingContext, bindingContextMayDifferFromDomParentElement) {
        // Prevent multiple applyBindings calls for the same node, except when a binding value is specified
        var alreadyBound = ko.utils.domData.get(node, boundElementDomDataKey);
        if (!sourceBindings) {
            if (alreadyBound) {
                throw Error("You cannot apply bindings multiple times to the same element.");
            }
            ko.utils.domData.set(node, boundElementDomDataKey, true);
        }

        // Optimization: Don't store the binding context on this node if it's definitely the same as on node.parentNode, because
        // we can easily recover it just by scanning up the node's ancestors in the DOM
        // (note: here, parent node means "real DOM parent" not "virtual parent", as there's no O(1) way to find the virtual parent)
        if (!alreadyBound && bindingContextMayDifferFromDomParentElement)
            ko.storedBindingContextForNode(node, bindingContext);

        // Use bindings if given, otherwise fall back on asking the bindings provider to give us some bindings
        var bindings;
        if (sourceBindings && typeof sourceBindings !== 'function') {
            bindings = sourceBindings;
        } else {
            var provider = ko.bindingProvider['instance'],
                getBindings = provider['getBindingAccessors'] || getBindingsAndMakeAccessors;

            // Get the binding from the provider within a computed observable so that we can update the bindings whenever
            // the binding context is updated or if the binding provider accesses observables.
            var bindingsUpdater = ko.dependentObservable(
                function() {
                    bindings = sourceBindings ? sourceBindings(bindingContext, node) : getBindings.call(provider, node, bindingContext);
                    // Register a dependency on the binding context to support observable view models.
                    if (bindings && bindingContext._subscribable)
                        bindingContext._subscribable();
                    return bindings;
                },
                null, { disposeWhenNodeIsRemoved: node }
            );

            if (!bindings || !bindingsUpdater.isActive())
                bindingsUpdater = null;
        }

        var bindingHandlerThatControlsDescendantBindings;
        if (bindings) {
            // Return the value accessor for a given binding. When bindings are static (won't be updated because of a binding
            // context update), just return the value accessor from the binding. Otherwise, return a function that always gets
            // the latest binding value and registers a dependency on the binding updater.
            var getValueAccessor = bindingsUpdater
                ? function(bindingKey) {
                    return function() {
                        return evaluateValueAccessor(bindingsUpdater()[bindingKey]);
                    };
                } : function(bindingKey) {
                    return bindings[bindingKey];
                };

            // Use of allBindings as a function is maintained for backwards compatibility, but its use is deprecated
            function allBindings() {
                return ko.utils.objectMap(bindingsUpdater ? bindingsUpdater() : bindings, evaluateValueAccessor);
            }
            // The following is the 3.x allBindings API
            allBindings['get'] = function(key) {
                return bindings[key] && evaluateValueAccessor(getValueAccessor(key));
            };
            allBindings['has'] = function(key) {
                return key in bindings;
            };

            // First put the bindings into the right order
            var orderedBindings = topologicalSortBindings(bindings);

            // Go through the sorted bindings, calling init and update for each
            ko.utils.arrayForEach(orderedBindings, function(bindingKeyAndHandler) {
                // Note that topologicalSortBindings has already filtered out any nonexistent binding handlers,
                // so bindingKeyAndHandler.handler will always be nonnull.
                var handlerInitFn = bindingKeyAndHandler.handler["init"],
                    handlerUpdateFn = bindingKeyAndHandler.handler["update"],
                    bindingKey = bindingKeyAndHandler.key;

                if (node.nodeType === 8) {
                    validateThatBindingIsAllowedForVirtualElements(bindingKey);
                }

                try {
                    // Run init, ignoring any dependencies
                    if (typeof handlerInitFn == "function") {
                        ko.dependencyDetection.ignore(function() {
                            var initResult = handlerInitFn(node, getValueAccessor(bindingKey), allBindings, bindingContext['$data'], bindingContext);

                            // If this binding handler claims to control descendant bindings, make a note of this
                            if (initResult && initResult['controlsDescendantBindings']) {
                                if (bindingHandlerThatControlsDescendantBindings !== undefined)
                                    throw new Error("Multiple bindings (" + bindingHandlerThatControlsDescendantBindings + " and " + bindingKey + ") are trying to control descendant bindings of the same element. You cannot use these bindings together on the same element.");
                                bindingHandlerThatControlsDescendantBindings = bindingKey;
                            }
                        });
                    }

                    // Run update in its own computed wrapper
                    if (typeof handlerUpdateFn == "function") {
                        ko.dependentObservable(
                            function() {
                                handlerUpdateFn(node, getValueAccessor(bindingKey), allBindings, bindingContext['$data'], bindingContext);
                            },
                            null,
                            { disposeWhenNodeIsRemoved: node }
                        );
                    }
                } catch (ex) {
                    ex.message = "Unable to process binding \"" + bindingKey + ": " + bindings[bindingKey] + "\"\nMessage: " + ex.message;
                    throw ex;
                }
            });
        }

        return {
            'shouldBindDescendants': bindingHandlerThatControlsDescendantBindings === undefined
        };
    };

    var storedBindingContextDomDataKey = ko.utils.domData.nextKey();
    ko.storedBindingContextForNode = function (node, bindingContext) {
        if (arguments.length == 2) {
            ko.utils.domData.set(node, storedBindingContextDomDataKey, bindingContext);
            if (bindingContext._subscribable)
                bindingContext._subscribable._addNode(node);
        } else {
            return ko.utils.domData.get(node, storedBindingContextDomDataKey);
        }
    }

    function getBindingContext(viewModelOrBindingContext) {
        return viewModelOrBindingContext && (viewModelOrBindingContext instanceof ko.bindingContext)
            ? viewModelOrBindingContext
            : new ko.bindingContext(viewModelOrBindingContext);
    }

    ko.applyBindingAccessorsToNode = function (node, bindings, viewModelOrBindingContext) {
        if (node.nodeType === 1) // If it's an element, workaround IE <= 8 HTML parsing weirdness
            ko.virtualElements.normaliseVirtualElementDomStructure(node);
        return applyBindingsToNodeInternal(node, bindings, getBindingContext(viewModelOrBindingContext), true);
    };

    ko.applyBindingsToNode = function (node, bindings, viewModelOrBindingContext) {
        var context = getBindingContext(viewModelOrBindingContext);
        return ko.applyBindingAccessorsToNode(node, makeBindingAccessors(bindings, context, node), context);
    };

    ko.applyBindingsToDescendants = function(viewModelOrBindingContext, rootNode) {
        if (rootNode.nodeType === 1 || rootNode.nodeType === 8)
            applyBindingsToDescendantsInternal(getBindingContext(viewModelOrBindingContext), rootNode, true);
    };

    ko.applyBindings = function (viewModelOrBindingContext, rootNode) {
        // If jQuery is loaded after Knockout, we won't initially have access to it. So save it here.
        if (!jQueryInstance && window['jQuery']) {
            jQueryInstance = window['jQuery'];
        }

        if (rootNode && (rootNode.nodeType !== 1) && (rootNode.nodeType !== 8))
            throw new Error("ko.applyBindings: first parameter should be your view model; second parameter should be a DOM node");
        rootNode = rootNode || window.document.body; // Make "rootNode" parameter optional

        applyBindingsToNodeAndDescendantsInternal(getBindingContext(viewModelOrBindingContext), rootNode, true);
    };

    // Retrieving binding context from arbitrary nodes
    ko.contextFor = function(node) {
        // We can only do something meaningful for elements and comment nodes (in particular, not text nodes, as IE can't store domdata for them)
        switch (node.nodeType) {
            case 1:
            case 8:
                var context = ko.storedBindingContextForNode(node);
                if (context) return context;
                if (node.parentNode) return ko.contextFor(node.parentNode);
                break;
        }
        return undefined;
    };
    ko.dataFor = function(node) {
        var context = ko.contextFor(node);
        return context ? context['$data'] : undefined;
    };

    ko.exportSymbol('bindingHandlers', ko.bindingHandlers);
    ko.exportSymbol('applyBindings', ko.applyBindings);
    ko.exportSymbol('applyBindingsToDescendants', ko.applyBindingsToDescendants);
    ko.exportSymbol('applyBindingAccessorsToNode', ko.applyBindingAccessorsToNode);
    ko.exportSymbol('applyBindingsToNode', ko.applyBindingsToNode);
    ko.exportSymbol('contextFor', ko.contextFor);
    ko.exportSymbol('dataFor', ko.dataFor);
})();
(function(undefined) {
    var loadingSubscribablesCache = {}, // Tracks component loads that are currently in flight
        loadedDefinitionsCache = {};    // Tracks component loads that have already completed

    ko.components = {
        get: function(componentName, callback) {
            var cachedDefinition = getObjectOwnProperty(loadedDefinitionsCache, componentName);
            if (cachedDefinition) {
                // It's already loaded and cached. Reuse the same definition object.
                // Note that for API consistency, even cache hits complete asynchronously by default.
                // You can bypass this by putting synchronous:true on your component config.
                if (cachedDefinition.isSynchronousComponent) {
                    ko.dependencyDetection.ignore(function() { // See comment in loaderRegistryBehaviors.js for reasoning
                        callback(cachedDefinition.definition);
                    });
                } else {
                    ko.tasks.schedule(function() { callback(cachedDefinition.definition); });
                }
            } else {
                // Join the loading process that is already underway, or start a new one.
                loadComponentAndNotify(componentName, callback);
            }
        },

        clearCachedDefinition: function(componentName) {
            delete loadedDefinitionsCache[componentName];
        },

        _getFirstResultFromLoaders: getFirstResultFromLoaders
    };

    function getObjectOwnProperty(obj, propName) {
        return obj.hasOwnProperty(propName) ? obj[propName] : undefined;
    }

    function loadComponentAndNotify(componentName, callback) {
        var subscribable = getObjectOwnProperty(loadingSubscribablesCache, componentName),
            completedAsync;
        if (!subscribable) {
            // It's not started loading yet. Start loading, and when it's done, move it to loadedDefinitionsCache.
            subscribable = loadingSubscribablesCache[componentName] = new ko.subscribable();
            subscribable.subscribe(callback);

            beginLoadingComponent(componentName, function(definition, config) {
                var isSynchronousComponent = !!(config && config['synchronous']);
                loadedDefinitionsCache[componentName] = { definition: definition, isSynchronousComponent: isSynchronousComponent };
                delete loadingSubscribablesCache[componentName];

                // For API consistency, all loads complete asynchronously. However we want to avoid
                // adding an extra task schedule if it's unnecessary (i.e., the completion is already
                // async).
                //
                // You can bypass the 'always asynchronous' feature by putting the synchronous:true
                // flag on your component configuration when you register it.
                if (completedAsync || isSynchronousComponent) {
                    // Note that notifySubscribers ignores any dependencies read within the callback.
                    // See comment in loaderRegistryBehaviors.js for reasoning
                    subscribable['notifySubscribers'](definition);
                } else {
                    ko.tasks.schedule(function() {
                        subscribable['notifySubscribers'](definition);
                    });
                }
            });
            completedAsync = true;
        } else {
            subscribable.subscribe(callback);
        }
    }

    function beginLoadingComponent(componentName, callback) {
        getFirstResultFromLoaders('getConfig', [componentName], function(config) {
            if (config) {
                // We have a config, so now load its definition
                getFirstResultFromLoaders('loadComponent', [componentName, config], function(definition) {
                    callback(definition, config);
                });
            } else {
                // The component has no config - it's unknown to all the loaders.
                // Note that this is not an error (e.g., a module loading error) - that would abort the
                // process and this callback would not run. For this callback to run, all loaders must
                // have confirmed they don't know about this component.
                callback(null, null);
            }
        });
    }

    function getFirstResultFromLoaders(methodName, argsExceptCallback, callback, candidateLoaders) {
        // On the first call in the stack, start with the full set of loaders
        if (!candidateLoaders) {
            candidateLoaders = ko.components['loaders'].slice(0); // Use a copy, because we'll be mutating this array
        }

        // Try the next candidate
        var currentCandidateLoader = candidateLoaders.shift();
        if (currentCandidateLoader) {
            var methodInstance = currentCandidateLoader[methodName];
            if (methodInstance) {
                var wasAborted = false,
                    synchronousReturnValue = methodInstance.apply(currentCandidateLoader, argsExceptCallback.concat(function(result) {
                        if (wasAborted) {
                            callback(null);
                        } else if (result !== null) {
                            // This candidate returned a value. Use it.
                            callback(result);
                        } else {
                            // Try the next candidate
                            getFirstResultFromLoaders(methodName, argsExceptCallback, callback, candidateLoaders);
                        }
                    }));

                // Currently, loaders may not return anything synchronously. This leaves open the possibility
                // that we'll extend the API to support synchronous return values in the future. It won't be
                // a breaking change, because currently no loader is allowed to return anything except undefined.
                if (synchronousReturnValue !== undefined) {
                    wasAborted = true;

                    // Method to suppress exceptions will remain undocumented. This is only to keep
                    // KO's specs running tidily, since we can observe the loading got aborted without
                    // having exceptions cluttering up the console too.
                    if (!currentCandidateLoader['suppressLoaderExceptions']) {
                        throw new Error('Component loaders must supply values by invoking the callback, not by returning values synchronously.');
                    }
                }
            } else {
                // This candidate doesn't have the relevant handler. Synchronously move on to the next one.
                getFirstResultFromLoaders(methodName, argsExceptCallback, callback, candidateLoaders);
            }
        } else {
            // No candidates returned a value
            callback(null);
        }
    }

    // Reference the loaders via string name so it's possible for developers
    // to replace the whole array by assigning to ko.components.loaders
    ko.components['loaders'] = [];

    ko.exportSymbol('components', ko.components);
    ko.exportSymbol('components.get', ko.components.get);
    ko.exportSymbol('components.clearCachedDefinition', ko.components.clearCachedDefinition);
})();
(function(undefined) {

    // The default loader is responsible for two things:
    // 1. Maintaining the default in-memory registry of component configuration objects
    //    (i.e., the thing you're writing to when you call ko.components.register(someName, ...))
    // 2. Answering requests for components by fetching configuration objects
    //    from that default in-memory registry and resolving them into standard
    //    component definition objects (of the form { createViewModel: ..., template: ... })
    // Custom loaders may override either of these facilities, i.e.,
    // 1. To supply configuration objects from some other source (e.g., conventions)
    // 2. Or, to resolve configuration objects by loading viewmodels/templates via arbitrary logic.

    var defaultConfigRegistry = {};

    ko.components.register = function(componentName, config) {
        if (!config) {
            throw new Error('Invalid configuration for ' + componentName);
        }

        if (ko.components.isRegistered(componentName)) {
            throw new Error('Component ' + componentName + ' is already registered');
        }

        defaultConfigRegistry[componentName] = config;
    };

    ko.components.isRegistered = function(componentName) {
        return defaultConfigRegistry.hasOwnProperty(componentName);
    };

    ko.components.unregister = function(componentName) {
        delete defaultConfigRegistry[componentName];
        ko.components.clearCachedDefinition(componentName);
    };

    ko.components.defaultLoader = {
        'getConfig': function(componentName, callback) {
            var result = defaultConfigRegistry.hasOwnProperty(componentName)
                ? defaultConfigRegistry[componentName]
                : null;
            callback(result);
        },

        'loadComponent': function(componentName, config, callback) {
            var errorCallback = makeErrorCallback(componentName);
            possiblyGetConfigFromAmd(errorCallback, config, function(loadedConfig) {
                resolveConfig(componentName, errorCallback, loadedConfig, callback);
            });
        },

        'loadTemplate': function(componentName, templateConfig, callback) {
            resolveTemplate(makeErrorCallback(componentName), templateConfig, callback);
        },

        'loadViewModel': function(componentName, viewModelConfig, callback) {
            resolveViewModel(makeErrorCallback(componentName), viewModelConfig, callback);
        }
    };

    var createViewModelKey = 'createViewModel';

    // Takes a config object of the form { template: ..., viewModel: ... }, and asynchronously convert it
    // into the standard component definition format:
    //    { template: <ArrayOfDomNodes>, createViewModel: function(params, componentInfo) { ... } }.
    // Since both template and viewModel may need to be resolved asynchronously, both tasks are performed
    // in parallel, and the results joined when both are ready. We don't depend on any promises infrastructure,
    // so this is implemented manually below.
    function resolveConfig(componentName, errorCallback, config, callback) {
        var result = {},
            makeCallBackWhenZero = 2,
            tryIssueCallback = function() {
                if (--makeCallBackWhenZero === 0) {
                    callback(result);
                }
            },
            templateConfig = config['template'],
            viewModelConfig = config['viewModel'];

        if (templateConfig) {
            possiblyGetConfigFromAmd(errorCallback, templateConfig, function(loadedConfig) {
                ko.components._getFirstResultFromLoaders('loadTemplate', [componentName, loadedConfig], function(resolvedTemplate) {
                    result['template'] = resolvedTemplate;
                    tryIssueCallback();
                });
            });
        } else {
            tryIssueCallback();
        }

        if (viewModelConfig) {
            possiblyGetConfigFromAmd(errorCallback, viewModelConfig, function(loadedConfig) {
                ko.components._getFirstResultFromLoaders('loadViewModel', [componentName, loadedConfig], function(resolvedViewModel) {
                    result[createViewModelKey] = resolvedViewModel;
                    tryIssueCallback();
                });
            });
        } else {
            tryIssueCallback();
        }
    }

    function resolveTemplate(errorCallback, templateConfig, callback) {
        if (typeof templateConfig === 'string') {
            // Markup - parse it
            callback(ko.utils.parseHtmlFragment(templateConfig));
        } else if (templateConfig instanceof Array) {
            // Assume already an array of DOM nodes - pass through unchanged
            callback(templateConfig);
        } else if (isDocumentFragment(templateConfig)) {
            // Document fragment - use its child nodes
            callback(ko.utils.makeArray(templateConfig.childNodes));
        } else if (templateConfig['element']) {
            var element = templateConfig['element'];
            if (isDomElement(element)) {
                // Element instance - copy its child nodes
                callback(cloneNodesFromTemplateSourceElement(element));
            } else if (typeof element === 'string') {
                // Element ID - find it, then copy its child nodes
                var elemInstance = document.getElementById(element);
                if (elemInstance) {
                    callback(cloneNodesFromTemplateSourceElement(elemInstance));
                } else {
                    errorCallback('Cannot find element with ID ' + element);
                }
            } else {
                errorCallback('Unknown element type: ' + element);
            }
        } else {
            errorCallback('Unknown template value: ' + templateConfig);
        }
    }

    function resolveViewModel(errorCallback, viewModelConfig, callback) {
        if (typeof viewModelConfig === 'function') {
            // Constructor - convert to standard factory function format
            // By design, this does *not* supply componentInfo to the constructor, as the intent is that
            // componentInfo contains non-viewmodel data (e.g., the component's element) that should only
            // be used in factory functions, not viewmodel constructors.
            callback(function (params /*, componentInfo */) {
                return new viewModelConfig(params);
            });
        } else if (typeof viewModelConfig[createViewModelKey] === 'function') {
            // Already a factory function - use it as-is
            callback(viewModelConfig[createViewModelKey]);
        } else if ('instance' in viewModelConfig) {
            // Fixed object instance - promote to createViewModel format for API consistency
            var fixedInstance = viewModelConfig['instance'];
            callback(function (params, componentInfo) {
                return fixedInstance;
            });
        } else if ('viewModel' in viewModelConfig) {
            // Resolved AMD module whose value is of the form { viewModel: ... }
            resolveViewModel(errorCallback, viewModelConfig['viewModel'], callback);
        } else {
            errorCallback('Unknown viewModel value: ' + viewModelConfig);
        }
    }

    function cloneNodesFromTemplateSourceElement(elemInstance) {
        switch (ko.utils.tagNameLower(elemInstance)) {
            case 'script':
                return ko.utils.parseHtmlFragment(elemInstance.text);
            case 'textarea':
                return ko.utils.parseHtmlFragment(elemInstance.value);
            case 'template':
                // For browsers with proper <template> element support (i.e., where the .content property
                // gives a document fragment), use that document fragment.
                if (isDocumentFragment(elemInstance.content)) {
                    return ko.utils.cloneNodes(elemInstance.content.childNodes);
                }
        }

        // Regular elements such as <div>, and <template> elements on old browsers that don't really
        // understand <template> and just treat it as a regular container
        return ko.utils.cloneNodes(elemInstance.childNodes);
    }

    function isDomElement(obj) {
        if (window['HTMLElement']) {
            return obj instanceof HTMLElement;
        } else {
            return obj && obj.tagName && obj.nodeType === 1;
        }
    }

    function isDocumentFragment(obj) {
        if (window['DocumentFragment']) {
            return obj instanceof DocumentFragment;
        } else {
            return obj && obj.nodeType === 11;
        }
    }

    function possiblyGetConfigFromAmd(errorCallback, config, callback) {
        if (typeof config['require'] === 'string') {
            // The config is the value of an AMD module
            if (amdRequire || window['require']) {
                (amdRequire || window['require'])([config['require']], callback);
            } else {
                errorCallback('Uses require, but no AMD loader is present');
            }
        } else {
            callback(config);
        }
    }

    function makeErrorCallback(componentName) {
        return function (message) {
            throw new Error('Component \'' + componentName + '\': ' + message);
        };
    }

    ko.exportSymbol('components.register', ko.components.register);
    ko.exportSymbol('components.isRegistered', ko.components.isRegistered);
    ko.exportSymbol('components.unregister', ko.components.unregister);

    // Expose the default loader so that developers can directly ask it for configuration
    // or to resolve configuration
    ko.exportSymbol('components.defaultLoader', ko.components.defaultLoader);

    // By default, the default loader is the only registered component loader
    ko.components['loaders'].push(ko.components.defaultLoader);

    // Privately expose the underlying config registry for use in old-IE shim
    ko.components._allRegisteredComponents = defaultConfigRegistry;
})();
(function (undefined) {
    // Overridable API for determining which component name applies to a given node. By overriding this,
    // you can for example map specific tagNames to components that are not preregistered.
    ko.components['getComponentNameForNode'] = function(node) {
        var tagNameLower = ko.utils.tagNameLower(node);
        if (ko.components.isRegistered(tagNameLower)) {
            // Try to determine that this node can be considered a *custom* element; see https://github.com/knockout/knockout/issues/1603
            if (tagNameLower.indexOf('-') != -1 || ('' + node) == "[object HTMLUnknownElement]" || (ko.utils.ieVersion <= 8 && node.tagName === tagNameLower)) {
                return tagNameLower;
            }
        }
    };

    ko.components.addBindingsForCustomElement = function(allBindings, node, bindingContext, valueAccessors) {
        // Determine if it's really a custom element matching a component
        if (node.nodeType === 1) {
            var componentName = ko.components['getComponentNameForNode'](node);
            if (componentName) {
                // It does represent a component, so add a component binding for it
                allBindings = allBindings || {};

                if (allBindings['component']) {
                    // Avoid silently overwriting some other 'component' binding that may already be on the element
                    throw new Error('Cannot use the "component" binding on a custom element matching a component');
                }

                var componentBindingValue = { 'name': componentName, 'params': getComponentParamsFromCustomElement(node, bindingContext) };

                allBindings['component'] = valueAccessors
                    ? function() { return componentBindingValue; }
                    : componentBindingValue;
            }
        }

        return allBindings;
    }

    var nativeBindingProviderInstance = new ko.bindingProvider();

    function getComponentParamsFromCustomElement(elem, bindingContext) {
        var paramsAttribute = elem.getAttribute('params');

        if (paramsAttribute) {
            var params = nativeBindingProviderInstance['parseBindingsString'](paramsAttribute, bindingContext, elem, { 'valueAccessors': true, 'bindingParams': true }),
                rawParamComputedValues = ko.utils.objectMap(params, function(paramValue, paramName) {
                    return ko.computed(paramValue, null, { disposeWhenNodeIsRemoved: elem });
                }),
                result = ko.utils.objectMap(rawParamComputedValues, function(paramValueComputed, paramName) {
                    var paramValue = paramValueComputed.peek();
                    // Does the evaluation of the parameter value unwrap any observables?
                    if (!paramValueComputed.isActive()) {
                        // No it doesn't, so there's no need for any computed wrapper. Just pass through the supplied value directly.
                        // Example: "someVal: firstName, age: 123" (whether or not firstName is an observable/computed)
                        return paramValue;
                    } else {
                        // Yes it does. Supply a computed property that unwraps both the outer (binding expression)
                        // level of observability, and any inner (resulting model value) level of observability.
                        // This means the component doesn't have to worry about multiple unwrapping. If the value is a
                        // writable observable, the computed will also be writable and pass the value on to the observable.
                        return ko.computed({
                            'read': function() {
                                return ko.utils.unwrapObservable(paramValueComputed());
                            },
                            'write': ko.isWriteableObservable(paramValue) && function(value) {
                                paramValueComputed()(value);
                            },
                            disposeWhenNodeIsRemoved: elem
                        });
                    }
                });

            // Give access to the raw computeds, as long as that wouldn't overwrite any custom param also called '$raw'
            // This is in case the developer wants to react to outer (binding) observability separately from inner
            // (model value) observability, or in case the model value observable has subobservables.
            if (!result.hasOwnProperty('$raw')) {
                result['$raw'] = rawParamComputedValues;
            }

            return result;
        } else {
            // For consistency, absence of a "params" attribute is treated the same as the presence of
            // any empty one. Otherwise component viewmodels need special code to check whether or not
            // 'params' or 'params.$raw' is null/undefined before reading subproperties, which is annoying.
            return { '$raw': {} };
        }
    }

    // --------------------------------------------------------------------------------
    // Compatibility code for older (pre-HTML5) IE browsers

    if (ko.utils.ieVersion < 9) {
        // Whenever you preregister a component, enable it as a custom element in the current document
        ko.components['register'] = (function(originalFunction) {
            return function(componentName) {
                document.createElement(componentName); // Allows IE<9 to parse markup containing the custom element
                return originalFunction.apply(this, arguments);
            }
        })(ko.components['register']);

        // Whenever you create a document fragment, enable all preregistered component names as custom elements
        // This is needed to make innerShiv/jQuery HTML parsing correctly handle the custom elements
        document.createDocumentFragment = (function(originalFunction) {
            return function() {
                var newDocFrag = originalFunction(),
                    allComponents = ko.components._allRegisteredComponents;
                for (var componentName in allComponents) {
                    if (allComponents.hasOwnProperty(componentName)) {
                        newDocFrag.createElement(componentName);
                    }
                }
                return newDocFrag;
            };
        })(document.createDocumentFragment);
    }
})();(function(undefined) {

    var componentLoadingOperationUniqueId = 0;

    ko.bindingHandlers['component'] = {
        'init': function(element, valueAccessor, ignored1, ignored2, bindingContext) {
            var currentViewModel,
                currentLoadingOperationId,
                disposeAssociatedComponentViewModel = function () {
                    var currentViewModelDispose = currentViewModel && currentViewModel['dispose'];
                    if (typeof currentViewModelDispose === 'function') {
                        currentViewModelDispose.call(currentViewModel);
                    }
                    currentViewModel = null;
                    // Any in-flight loading operation is no longer relevant, so make sure we ignore its completion
                    currentLoadingOperationId = null;
                },
                originalChildNodes = ko.utils.makeArray(ko.virtualElements.childNodes(element));

            ko.utils.domNodeDisposal.addDisposeCallback(element, disposeAssociatedComponentViewModel);

            ko.computed(function () {
                var value = ko.utils.unwrapObservable(valueAccessor()),
                    componentName, componentParams;

                if (typeof value === 'string') {
                    componentName = value;
                } else {
                    componentName = ko.utils.unwrapObservable(value['name']);
                    componentParams = ko.utils.unwrapObservable(value['params']);
                }

                if (!componentName) {
                    throw new Error('No component name specified');
                }

                var loadingOperationId = currentLoadingOperationId = ++componentLoadingOperationUniqueId;
                ko.components.get(componentName, function(componentDefinition) {
                    // If this is not the current load operation for this element, ignore it.
                    if (currentLoadingOperationId !== loadingOperationId) {
                        return;
                    }

                    // Clean up previous state
                    disposeAssociatedComponentViewModel();

                    // Instantiate and bind new component. Implicitly this cleans any old DOM nodes.
                    if (!componentDefinition) {
                        throw new Error('Unknown component \'' + componentName + '\'');
                    }
                    cloneTemplateIntoElement(componentName, componentDefinition, element);
                    var componentViewModel = createViewModel(componentDefinition, element, originalChildNodes, componentParams),
                        childBindingContext = bindingContext['createChildContext'](componentViewModel, /* dataItemAlias */ undefined, function(ctx) {
                            ctx['$component'] = componentViewModel;
                            ctx['$componentTemplateNodes'] = originalChildNodes;
                        });
                    currentViewModel = componentViewModel;
                    ko.applyBindingsToDescendants(childBindingContext, element);
                });
            }, null, { disposeWhenNodeIsRemoved: element });

            return { 'controlsDescendantBindings': true };
        }
    };

    ko.virtualElements.allowedBindings['component'] = true;

    function cloneTemplateIntoElement(componentName, componentDefinition, element) {
        var template = componentDefinition['template'];
        if (!template) {
            throw new Error('Component \'' + componentName + '\' has no template');
        }

        var clonedNodesArray = ko.utils.cloneNodes(template);
        ko.virtualElements.setDomNodeChildren(element, clonedNodesArray);
    }

    function createViewModel(componentDefinition, element, originalChildNodes, componentParams) {
        var componentViewModelFactory = componentDefinition['createViewModel'];
        return componentViewModelFactory
            ? componentViewModelFactory.call(componentDefinition, componentParams, { 'element': element, 'templateNodes': originalChildNodes })
            : componentParams; // Template-only component
    }

})();
var attrHtmlToJavascriptMap = { 'class': 'className', 'for': 'htmlFor' };
ko.bindingHandlers['attr'] = {
    'update': function(element, valueAccessor, allBindings) {
        var value = ko.utils.unwrapObservable(valueAccessor()) || {};
        ko.utils.objectForEach(value, function(attrName, attrValue) {
            attrValue = ko.utils.unwrapObservable(attrValue);

            // To cover cases like "attr: { checked:someProp }", we want to remove the attribute entirely
            // when someProp is a "no value"-like value (strictly null, false, or undefined)
            // (because the absence of the "checked" attr is how to mark an element as not checked, etc.)
            var toRemove = (attrValue === false) || (attrValue === null) || (attrValue === undefined);
            if (toRemove)
                element.removeAttribute(attrName);

            // In IE <= 7 and IE8 Quirks Mode, you have to use the Javascript property name instead of the
            // HTML attribute name for certain attributes. IE8 Standards Mode supports the correct behavior,
            // but instead of figuring out the mode, we'll just set the attribute through the Javascript
            // property for IE <= 8.
            if (ko.utils.ieVersion <= 8 && attrName in attrHtmlToJavascriptMap) {
                attrName = attrHtmlToJavascriptMap[attrName];
                if (toRemove)
                    element.removeAttribute(attrName);
                else
                    element[attrName] = attrValue;
            } else if (!toRemove) {
                element.setAttribute(attrName, attrValue.toString());
            }

            // Treat "name" specially - although you can think of it as an attribute, it also needs
            // special handling on older versions of IE (https://github.com/SteveSanderson/knockout/pull/333)
            // Deliberately being case-sensitive here because XHTML would regard "Name" as a different thing
            // entirely, and there's no strong reason to allow for such casing in HTML.
            if (attrName === "name") {
                ko.utils.setElementName(element, toRemove ? "" : attrValue.toString());
            }
        });
    }
};
(function() {

ko.bindingHandlers['checked'] = {
    'after': ['value', 'attr'],
    'init': function (element, valueAccessor, allBindings) {
        var checkedValue = ko.pureComputed(function() {
            // Treat "value" like "checkedValue" when it is included with "checked" binding
            if (allBindings['has']('checkedValue')) {
                return ko.utils.unwrapObservable(allBindings.get('checkedValue'));
            } else if (allBindings['has']('value')) {
                return ko.utils.unwrapObservable(allBindings.get('value'));
            }

            return element.value;
        });

        function updateModel() {
            // This updates the model value from the view value.
            // It runs in response to DOM events (click) and changes in checkedValue.
            var isChecked = element.checked,
                elemValue = useCheckedValue ? checkedValue() : isChecked;

            // When we're first setting up this computed, don't change any model state.
            if (ko.computedContext.isInitial()) {
                return;
            }

            // We can ignore unchecked radio buttons, because some other radio
            // button will be getting checked, and that one can take care of updating state.
            if (isRadio && !isChecked) {
                return;
            }

            var modelValue = ko.dependencyDetection.ignore(valueAccessor);
            if (valueIsArray) {
                var writableValue = rawValueIsNonArrayObservable ? modelValue.peek() : modelValue;
                if (oldElemValue !== elemValue) {
                    // When we're responding to the checkedValue changing, and the element is
                    // currently checked, replace the old elem value with the new elem value
                    // in the model array.
                    if (isChecked) {
                        ko.utils.addOrRemoveItem(writableValue, elemValue, true);
                        ko.utils.addOrRemoveItem(writableValue, oldElemValue, false);
                    }

                    oldElemValue = elemValue;
                } else {
                    // When we're responding to the user having checked/unchecked a checkbox,
                    // add/remove the element value to the model array.
                    ko.utils.addOrRemoveItem(writableValue, elemValue, isChecked);
                }
                if (rawValueIsNonArrayObservable && ko.isWriteableObservable(modelValue)) {
                    modelValue(writableValue);
                }
            } else {
                ko.expressionRewriting.writeValueToProperty(modelValue, allBindings, 'checked', elemValue, true);
            }
        };

        function updateView() {
            // This updates the view value from the model value.
            // It runs in response to changes in the bound (checked) value.
            var modelValue = ko.utils.unwrapObservable(valueAccessor());

            if (valueIsArray) {
                // When a checkbox is bound to an array, being checked represents its value being present in that array
                element.checked = ko.utils.arrayIndexOf(modelValue, checkedValue()) >= 0;
            } else if (isCheckbox) {
                // When a checkbox is bound to any other value (not an array), being checked represents the value being trueish
                element.checked = modelValue;
            } else {
                // For radio buttons, being checked means that the radio button's value corresponds to the model value
                element.checked = (checkedValue() === modelValue);
            }
        };

        var isCheckbox = element.type == "checkbox",
            isRadio = element.type == "radio";

        // Only bind to check boxes and radio buttons
        if (!isCheckbox && !isRadio) {
            return;
        }

        var rawValue = valueAccessor(),
            valueIsArray = isCheckbox && (ko.utils.unwrapObservable(rawValue) instanceof Array),
            rawValueIsNonArrayObservable = !(valueIsArray && rawValue.push && rawValue.splice),
            oldElemValue = valueIsArray ? checkedValue() : undefined,
            useCheckedValue = isRadio || valueIsArray;

        // IE 6 won't allow radio buttons to be selected unless they have a name
        if (isRadio && !element.name)
            ko.bindingHandlers['uniqueName']['init'](element, function() { return true });

        // Set up two computeds to update the binding:

        // The first responds to changes in the checkedValue value and to element clicks
        ko.computed(updateModel, null, { disposeWhenNodeIsRemoved: element });
        ko.utils.registerEventHandler(element, "click", updateModel);

        // The second responds to changes in the model value (the one associated with the checked binding)
        ko.computed(updateView, null, { disposeWhenNodeIsRemoved: element });

        rawValue = undefined;
    }
};
ko.expressionRewriting.twoWayBindings['checked'] = true;

ko.bindingHandlers['checkedValue'] = {
    'update': function (element, valueAccessor) {
        element.value = ko.utils.unwrapObservable(valueAccessor());
    }
};

})();var classesWrittenByBindingKey = '__ko__cssValue';
ko.bindingHandlers['css'] = {
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        if (value !== null && typeof value == "object") {
            ko.utils.objectForEach(value, function(className, shouldHaveClass) {
                shouldHaveClass = ko.utils.unwrapObservable(shouldHaveClass);
                ko.utils.toggleDomNodeCssClass(element, className, shouldHaveClass);
            });
        } else {
            value = ko.utils.stringTrim(String(value || '')); // Make sure we don't try to store or set a non-string value
            ko.utils.toggleDomNodeCssClass(element, element[classesWrittenByBindingKey], false);
            element[classesWrittenByBindingKey] = value;
            ko.utils.toggleDomNodeCssClass(element, value, true);
        }
    }
};
ko.bindingHandlers['enable'] = {
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        if (value && element.disabled)
            element.removeAttribute("disabled");
        else if ((!value) && (!element.disabled))
            element.disabled = true;
    }
};

ko.bindingHandlers['disable'] = {
    'update': function (element, valueAccessor) {
        ko.bindingHandlers['enable']['update'](element, function() { return !ko.utils.unwrapObservable(valueAccessor()) });
    }
};
// For certain common events (currently just 'click'), allow a simplified data-binding syntax
// e.g. click:handler instead of the usual full-length event:{click:handler}
function makeEventHandlerShortcut(eventName) {
    ko.bindingHandlers[eventName] = {
        'init': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var newValueAccessor = function () {
                var result = {};
                result[eventName] = valueAccessor();
                return result;
            };
            return ko.bindingHandlers['event']['init'].call(this, element, newValueAccessor, allBindings, viewModel, bindingContext);
        }
    }
}

ko.bindingHandlers['event'] = {
    'init' : function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var eventsToHandle = valueAccessor() || {};
        ko.utils.objectForEach(eventsToHandle, function(eventName) {
            if (typeof eventName == "string") {
                ko.utils.registerEventHandler(element, eventName, function (event) {
                    var handlerReturnValue;
                    var handlerFunction = valueAccessor()[eventName];
                    if (!handlerFunction)
                        return;

                    try {
                        // Take all the event args, and prefix with the viewmodel
                        var argsForHandler = ko.utils.makeArray(arguments);
                        viewModel = bindingContext['$data'];
                        argsForHandler.unshift(viewModel);
                        handlerReturnValue = handlerFunction.apply(viewModel, argsForHandler);
                    } finally {
                        if (handlerReturnValue !== true) { // Normally we want to prevent default action. Developer can override this be explicitly returning true.
                            if (event.preventDefault)
                                event.preventDefault();
                            else
                                event.returnValue = false;
                        }
                    }

                    var bubble = allBindings.get(eventName + 'Bubble') !== false;
                    if (!bubble) {
                        event.cancelBubble = true;
                        if (event.stopPropagation)
                            event.stopPropagation();
                    }
                });
            }
        });
    }
};
// "foreach: someExpression" is equivalent to "template: { foreach: someExpression }"
// "foreach: { data: someExpression, afterAdd: myfn }" is equivalent to "template: { foreach: someExpression, afterAdd: myfn }"
ko.bindingHandlers['foreach'] = {
    makeTemplateValueAccessor: function(valueAccessor) {
        return function() {
            var modelValue = valueAccessor(),
                unwrappedValue = ko.utils.peekObservable(modelValue);    // Unwrap without setting a dependency here

            // If unwrappedValue is the array, pass in the wrapped value on its own
            // The value will be unwrapped and tracked within the template binding
            // (See https://github.com/SteveSanderson/knockout/issues/523)
            if ((!unwrappedValue) || typeof unwrappedValue.length == "number")
                return { 'foreach': modelValue, 'templateEngine': ko.nativeTemplateEngine.instance };

            // If unwrappedValue.data is the array, preserve all relevant options and unwrap again value so we get updates
            ko.utils.unwrapObservable(modelValue);
            return {
                'foreach': unwrappedValue['data'],
                'as': unwrappedValue['as'],
                'includeDestroyed': unwrappedValue['includeDestroyed'],
                'afterAdd': unwrappedValue['afterAdd'],
                'beforeRemove': unwrappedValue['beforeRemove'],
                'afterRender': unwrappedValue['afterRender'],
                'beforeMove': unwrappedValue['beforeMove'],
                'afterMove': unwrappedValue['afterMove'],
                'templateEngine': ko.nativeTemplateEngine.instance
            };
        };
    },
    'init': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        return ko.bindingHandlers['template']['init'](element, ko.bindingHandlers['foreach'].makeTemplateValueAccessor(valueAccessor));
    },
    'update': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        return ko.bindingHandlers['template']['update'](element, ko.bindingHandlers['foreach'].makeTemplateValueAccessor(valueAccessor), allBindings, viewModel, bindingContext);
    }
};
ko.expressionRewriting.bindingRewriteValidators['foreach'] = false; // Can't rewrite control flow bindings
ko.virtualElements.allowedBindings['foreach'] = true;
var hasfocusUpdatingProperty = '__ko_hasfocusUpdating';
var hasfocusLastValue = '__ko_hasfocusLastValue';
ko.bindingHandlers['hasfocus'] = {
    'init': function(element, valueAccessor, allBindings) {
        var handleElementFocusChange = function(isFocused) {
            // Where possible, ignore which event was raised and determine focus state using activeElement,
            // as this avoids phantom focus/blur events raised when changing tabs in modern browsers.
            // However, not all KO-targeted browsers (Firefox 2) support activeElement. For those browsers,
            // prevent a loss of focus when changing tabs/windows by setting a flag that prevents hasfocus
            // from calling 'blur()' on the element when it loses focus.
            // Discussion at https://github.com/SteveSanderson/knockout/pull/352
            element[hasfocusUpdatingProperty] = true;
            var ownerDoc = element.ownerDocument;
            if ("activeElement" in ownerDoc) {
                var active;
                try {
                    active = ownerDoc.activeElement;
                } catch(e) {
                    // IE9 throws if you access activeElement during page load (see issue #703)
                    active = ownerDoc.body;
                }
                isFocused = (active === element);
            }
            var modelValue = valueAccessor();
            ko.expressionRewriting.writeValueToProperty(modelValue, allBindings, 'hasfocus', isFocused, true);

            //cache the latest value, so we can avoid unnecessarily calling focus/blur in the update function
            element[hasfocusLastValue] = isFocused;
            element[hasfocusUpdatingProperty] = false;
        };
        var handleElementFocusIn = handleElementFocusChange.bind(null, true);
        var handleElementFocusOut = handleElementFocusChange.bind(null, false);

        ko.utils.registerEventHandler(element, "focus", handleElementFocusIn);
        ko.utils.registerEventHandler(element, "focusin", handleElementFocusIn); // For IE
        ko.utils.registerEventHandler(element, "blur",  handleElementFocusOut);
        ko.utils.registerEventHandler(element, "focusout",  handleElementFocusOut); // For IE
    },
    'update': function(element, valueAccessor) {
        var value = !!ko.utils.unwrapObservable(valueAccessor());

        if (!element[hasfocusUpdatingProperty] && element[hasfocusLastValue] !== value) {
            value ? element.focus() : element.blur();

            // In IE, the blur method doesn't always cause the element to lose focus (for example, if the window is not in focus).
            // Setting focus to the body element does seem to be reliable in IE, but should only be used if we know that the current
            // element was focused already.
            if (!value && element[hasfocusLastValue]) {
                element.ownerDocument.body.focus();
            }

            // For IE, which doesn't reliably fire "focus" or "blur" events synchronously
            ko.dependencyDetection.ignore(ko.utils.triggerEvent, null, [element, value ? "focusin" : "focusout"]);
        }
    }
};
ko.expressionRewriting.twoWayBindings['hasfocus'] = true;

ko.bindingHandlers['hasFocus'] = ko.bindingHandlers['hasfocus']; // Make "hasFocus" an alias
ko.expressionRewriting.twoWayBindings['hasFocus'] = true;
ko.bindingHandlers['html'] = {
    'init': function() {
        // Prevent binding on the dynamically-injected HTML (as developers are unlikely to expect that, and it has security implications)
        return { 'controlsDescendantBindings': true };
    },
    'update': function (element, valueAccessor) {
        // setHtml will unwrap the value if needed
        ko.utils.setHtml(element, valueAccessor());
    }
};
// Makes a binding like with or if
function makeWithIfBinding(bindingKey, isWith, isNot, makeContextCallback) {
    ko.bindingHandlers[bindingKey] = {
        'init': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var didDisplayOnLastUpdate,
                savedNodes;
            ko.computed(function() {
                var dataValue = ko.utils.unwrapObservable(valueAccessor()),
                    shouldDisplay = !isNot !== !dataValue, // equivalent to isNot ? !dataValue : !!dataValue
                    isFirstRender = !savedNodes,
                    needsRefresh = isFirstRender || isWith || (shouldDisplay !== didDisplayOnLastUpdate);

                if (needsRefresh) {
                    // Save a copy of the inner nodes on the initial update, but only if we have dependencies.
                    if (isFirstRender && ko.computedContext.getDependenciesCount()) {
                        savedNodes = ko.utils.cloneNodes(ko.virtualElements.childNodes(element), true /* shouldCleanNodes */);
                    }

                    if (shouldDisplay) {
                        if (!isFirstRender) {
                            ko.virtualElements.setDomNodeChildren(element, ko.utils.cloneNodes(savedNodes));
                        }
                        ko.applyBindingsToDescendants(makeContextCallback ? makeContextCallback(bindingContext, dataValue) : bindingContext, element);
                    } else {
                        ko.virtualElements.emptyNode(element);
                    }

                    didDisplayOnLastUpdate = shouldDisplay;
                }
            }, null, { disposeWhenNodeIsRemoved: element });
            return { 'controlsDescendantBindings': true };
        }
    };
    ko.expressionRewriting.bindingRewriteValidators[bindingKey] = false; // Can't rewrite control flow bindings
    ko.virtualElements.allowedBindings[bindingKey] = true;
}

// Construct the actual binding handlers
makeWithIfBinding('if');
makeWithIfBinding('ifnot', false /* isWith */, true /* isNot */);
makeWithIfBinding('with', true /* isWith */, false /* isNot */,
    function(bindingContext, dataValue) {
        return bindingContext['createChildContext'](dataValue);
    }
);
var captionPlaceholder = {};
ko.bindingHandlers['options'] = {
    'init': function(element) {
        if (ko.utils.tagNameLower(element) !== "select")
            throw new Error("options binding applies only to SELECT elements");

        // Remove all existing <option>s.
        while (element.length > 0) {
            element.remove(0);
        }

        // Ensures that the binding processor doesn't try to bind the options
        return { 'controlsDescendantBindings': true };
    },
    'update': function (element, valueAccessor, allBindings) {
        function selectedOptions() {
            return ko.utils.arrayFilter(element.options, function (node) { return node.selected; });
        }

        var selectWasPreviouslyEmpty = element.length == 0,
            multiple = element.multiple,
            previousScrollTop = (!selectWasPreviouslyEmpty && multiple) ? element.scrollTop : null,
            unwrappedArray = ko.utils.unwrapObservable(valueAccessor()),
            valueAllowUnset = allBindings.get('valueAllowUnset') && allBindings['has']('value'),
            includeDestroyed = allBindings.get('optionsIncludeDestroyed'),
            arrayToDomNodeChildrenOptions = {},
            captionValue,
            filteredArray,
            previousSelectedValues = [];

        if (!valueAllowUnset) {
            if (multiple) {
                previousSelectedValues = ko.utils.arrayMap(selectedOptions(), ko.selectExtensions.readValue);
            } else if (element.selectedIndex >= 0) {
                previousSelectedValues.push(ko.selectExtensions.readValue(element.options[element.selectedIndex]));
            }
        }

        if (unwrappedArray) {
            if (typeof unwrappedArray.length == "undefined") // Coerce single value into array
                unwrappedArray = [unwrappedArray];

            // Filter out any entries marked as destroyed
            filteredArray = ko.utils.arrayFilter(unwrappedArray, function(item) {
                return includeDestroyed || item === undefined || item === null || !ko.utils.unwrapObservable(item['_destroy']);
            });

            // If caption is included, add it to the array
            if (allBindings['has']('optionsCaption')) {
                captionValue = ko.utils.unwrapObservable(allBindings.get('optionsCaption'));
                // If caption value is null or undefined, don't show a caption
                if (captionValue !== null && captionValue !== undefined) {
                    filteredArray.unshift(captionPlaceholder);
                }
            }
        } else {
            // If a falsy value is provided (e.g. null), we'll simply empty the select element
        }

        function applyToObject(object, predicate, defaultValue) {
            var predicateType = typeof predicate;
            if (predicateType == "function")    // Given a function; run it against the data value
                return predicate(object);
            else if (predicateType == "string") // Given a string; treat it as a property name on the data value
                return object[predicate];
            else                                // Given no optionsText arg; use the data value itself
                return defaultValue;
        }

        // The following functions can run at two different times:
        // The first is when the whole array is being updated directly from this binding handler.
        // The second is when an observable value for a specific array entry is updated.
        // oldOptions will be empty in the first case, but will be filled with the previously generated option in the second.
        var itemUpdate = false;
        function optionForArrayItem(arrayEntry, index, oldOptions) {
            if (oldOptions.length) {
                previousSelectedValues = !valueAllowUnset && oldOptions[0].selected ? [ ko.selectExtensions.readValue(oldOptions[0]) ] : [];
                itemUpdate = true;
            }
            var option = element.ownerDocument.createElement("option");
            if (arrayEntry === captionPlaceholder) {
                ko.utils.setTextContent(option, allBindings.get('optionsCaption'));
                ko.selectExtensions.writeValue(option, undefined);
            } else {
                // Apply a value to the option element
                var optionValue = applyToObject(arrayEntry, allBindings.get('optionsValue'), arrayEntry);
                ko.selectExtensions.writeValue(option, ko.utils.unwrapObservable(optionValue));

                // Apply some text to the option element
                var optionText = applyToObject(arrayEntry, allBindings.get('optionsText'), optionValue);
                ko.utils.setTextContent(option, optionText);
            }
            return [option];
        }

        // By using a beforeRemove callback, we delay the removal until after new items are added. This fixes a selection
        // problem in IE<=8 and Firefox. See https://github.com/knockout/knockout/issues/1208
        arrayToDomNodeChildrenOptions['beforeRemove'] =
            function (option) {
                element.removeChild(option);
            };

        function setSelectionCallback(arrayEntry, newOptions) {
            if (itemUpdate && valueAllowUnset) {
                // The model value is authoritative, so make sure its value is the one selected
                // There is no need to use dependencyDetection.ignore since setDomNodeChildrenFromArrayMapping does so already.
                ko.selectExtensions.writeValue(element, ko.utils.unwrapObservable(allBindings.get('value')), true /* allowUnset */);
            } else if (previousSelectedValues.length) {
                // IE6 doesn't like us to assign selection to OPTION nodes before they're added to the document.
                // That's why we first added them without selection. Now it's time to set the selection.
                var isSelected = ko.utils.arrayIndexOf(previousSelectedValues, ko.selectExtensions.readValue(newOptions[0])) >= 0;
                ko.utils.setOptionNodeSelectionState(newOptions[0], isSelected);

                // If this option was changed from being selected during a single-item update, notify the change
                if (itemUpdate && !isSelected) {
                    ko.dependencyDetection.ignore(ko.utils.triggerEvent, null, [element, "change"]);
                }
            }
        }

        var callback = setSelectionCallback;
        if (allBindings['has']('optionsAfterRender') && typeof allBindings.get('optionsAfterRender') == "function") {
            callback = function(arrayEntry, newOptions) {
                setSelectionCallback(arrayEntry, newOptions);
                ko.dependencyDetection.ignore(allBindings.get('optionsAfterRender'), null, [newOptions[0], arrayEntry !== captionPlaceholder ? arrayEntry : undefined]);
            }
        }

        ko.utils.setDomNodeChildrenFromArrayMapping(element, filteredArray, optionForArrayItem, arrayToDomNodeChildrenOptions, callback);

        ko.dependencyDetection.ignore(function () {
            if (valueAllowUnset) {
                // The model value is authoritative, so make sure its value is the one selected
                ko.selectExtensions.writeValue(element, ko.utils.unwrapObservable(allBindings.get('value')), true /* allowUnset */);
            } else {
                // Determine if the selection has changed as a result of updating the options list
                var selectionChanged;
                if (multiple) {
                    // For a multiple-select box, compare the new selection count to the previous one
                    // But if nothing was selected before, the selection can't have changed
                    selectionChanged = previousSelectedValues.length && selectedOptions().length < previousSelectedValues.length;
                } else {
                    // For a single-select box, compare the current value to the previous value
                    // But if nothing was selected before or nothing is selected now, just look for a change in selection
                    selectionChanged = (previousSelectedValues.length && element.selectedIndex >= 0)
                        ? (ko.selectExtensions.readValue(element.options[element.selectedIndex]) !== previousSelectedValues[0])
                        : (previousSelectedValues.length || element.selectedIndex >= 0);
                }

                // Ensure consistency between model value and selected option.
                // If the dropdown was changed so that selection is no longer the same,
                // notify the value or selectedOptions binding.
                if (selectionChanged) {
                    ko.utils.triggerEvent(element, "change");
                }
            }
        });

        // Workaround for IE bug
        ko.utils.ensureSelectElementIsRenderedCorrectly(element);

        if (previousScrollTop && Math.abs(previousScrollTop - element.scrollTop) > 20)
            element.scrollTop = previousScrollTop;
    }
};
ko.bindingHandlers['options'].optionValueDomDataKey = ko.utils.domData.nextKey();
ko.bindingHandlers['selectedOptions'] = {
    'after': ['options', 'foreach'],
    'init': function (element, valueAccessor, allBindings) {
        ko.utils.registerEventHandler(element, "change", function () {
            var value = valueAccessor(), valueToWrite = [];
            ko.utils.arrayForEach(element.getElementsByTagName("option"), function(node) {
                if (node.selected)
                    valueToWrite.push(ko.selectExtensions.readValue(node));
            });
            ko.expressionRewriting.writeValueToProperty(value, allBindings, 'selectedOptions', valueToWrite);
        });
    },
    'update': function (element, valueAccessor) {
        if (ko.utils.tagNameLower(element) != "select")
            throw new Error("values binding applies only to SELECT elements");

        var newValue = ko.utils.unwrapObservable(valueAccessor()),
            previousScrollTop = element.scrollTop;

        if (newValue && typeof newValue.length == "number") {
            ko.utils.arrayForEach(element.getElementsByTagName("option"), function(node) {
                var isSelected = ko.utils.arrayIndexOf(newValue, ko.selectExtensions.readValue(node)) >= 0;
                if (node.selected != isSelected) {      // This check prevents flashing of the select element in IE
                    ko.utils.setOptionNodeSelectionState(node, isSelected);
                }
            });
        }

        element.scrollTop = previousScrollTop;
    }
};
ko.expressionRewriting.twoWayBindings['selectedOptions'] = true;
ko.bindingHandlers['style'] = {
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor() || {});
        ko.utils.objectForEach(value, function(styleName, styleValue) {
            styleValue = ko.utils.unwrapObservable(styleValue);

            if (styleValue === null || styleValue === undefined || styleValue === false) {
                // Empty string removes the value, whereas null/undefined have no effect
                styleValue = "";
            }

            element.style[styleName] = styleValue;
        });
    }
};
ko.bindingHandlers['submit'] = {
    'init': function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        if (typeof valueAccessor() != "function")
            throw new Error("The value for a submit binding must be a function");
        ko.utils.registerEventHandler(element, "submit", function (event) {
            var handlerReturnValue;
            var value = valueAccessor();
            try { handlerReturnValue = value.call(bindingContext['$data'], element); }
            finally {
                if (handlerReturnValue !== true) { // Normally we want to prevent default action. Developer can override this be explicitly returning true.
                    if (event.preventDefault)
                        event.preventDefault();
                    else
                        event.returnValue = false;
                }
            }
        });
    }
};
ko.bindingHandlers['text'] = {
    'init': function() {
        // Prevent binding on the dynamically-injected text node (as developers are unlikely to expect that, and it has security implications).
        // It should also make things faster, as we no longer have to consider whether the text node might be bindable.
        return { 'controlsDescendantBindings': true };
    },
    'update': function (element, valueAccessor) {
        ko.utils.setTextContent(element, valueAccessor());
    }
};
ko.virtualElements.allowedBindings['text'] = true;
(function () {

if (window && window.navigator) {
    var parseVersion = function (matches) {
        if (matches) {
            return parseFloat(matches[1]);
        }
    };

    // Detect various browser versions because some old versions don't fully support the 'input' event
    var operaVersion = window.opera && window.opera.version && parseInt(window.opera.version()),
        userAgent = window.navigator.userAgent,
        safariVersion = parseVersion(userAgent.match(/^(?:(?!chrome).)*version\/([^ ]*) safari/i)),
        firefoxVersion = parseVersion(userAgent.match(/Firefox\/([^ ]*)/));
}

// IE 8 and 9 have bugs that prevent the normal events from firing when the value changes.
// But it does fire the 'selectionchange' event on many of those, presumably because the
// cursor is moving and that counts as the selection changing. The 'selectionchange' event is
// fired at the document level only and doesn't directly indicate which element changed. We
// set up just one event handler for the document and use 'activeElement' to determine which
// element was changed.
if (ko.utils.ieVersion < 10) {
    var selectionChangeRegisteredName = ko.utils.domData.nextKey(),
        selectionChangeHandlerName = ko.utils.domData.nextKey();
    var selectionChangeHandler = function(event) {
        var target = this.activeElement,
            handler = target && ko.utils.domData.get(target, selectionChangeHandlerName);
        if (handler) {
            handler(event);
        }
    };
    var registerForSelectionChangeEvent = function (element, handler) {
        var ownerDoc = element.ownerDocument;
        if (!ko.utils.domData.get(ownerDoc, selectionChangeRegisteredName)) {
            ko.utils.domData.set(ownerDoc, selectionChangeRegisteredName, true);
            ko.utils.registerEventHandler(ownerDoc, 'selectionchange', selectionChangeHandler);
        }
        ko.utils.domData.set(element, selectionChangeHandlerName, handler);
    };
}

ko.bindingHandlers['textInput'] = {
    'init': function (element, valueAccessor, allBindings) {

        var previousElementValue = element.value,
            timeoutHandle,
            elementValueBeforeEvent;

        var updateModel = function (event) {
            clearTimeout(timeoutHandle);
            elementValueBeforeEvent = timeoutHandle = undefined;

            var elementValue = element.value;
            if (previousElementValue !== elementValue) {
                // Provide a way for tests to know exactly which event was processed
                if (DEBUG && event) element['_ko_textInputProcessedEvent'] = event.type;
                previousElementValue = elementValue;
                ko.expressionRewriting.writeValueToProperty(valueAccessor(), allBindings, 'textInput', elementValue);
            }
        };

        var deferUpdateModel = function (event) {
            if (!timeoutHandle) {
                // The elementValueBeforeEvent variable is set *only* during the brief gap between an
                // event firing and the updateModel function running. This allows us to ignore model
                // updates that are from the previous state of the element, usually due to techniques
                // such as rateLimit. Such updates, if not ignored, can cause keystrokes to be lost.
                elementValueBeforeEvent = element.value;
                var handler = DEBUG ? updateModel.bind(element, {type: event.type}) : updateModel;
                timeoutHandle = ko.utils.setTimeout(handler, 4);
            }
        };

        // IE9 will mess up the DOM if you handle events synchronously which results in DOM changes (such as other bindings);
        // so we'll make sure all updates are asynchronous
        var ieUpdateModel = ko.utils.ieVersion == 9 ? deferUpdateModel : updateModel;

        var updateView = function () {
            var modelValue = ko.utils.unwrapObservable(valueAccessor());

            if (modelValue === null || modelValue === undefined) {
                modelValue = '';
            }

            if (elementValueBeforeEvent !== undefined && modelValue === elementValueBeforeEvent) {
                ko.utils.setTimeout(updateView, 4);
                return;
            }

            // Update the element only if the element and model are different. On some browsers, updating the value
            // will move the cursor to the end of the input, which would be bad while the user is typing.
            if (element.value !== modelValue) {
                previousElementValue = modelValue;  // Make sure we ignore events (propertychange) that result from updating the value
                element.value = modelValue;
            }
        };

        var onEvent = function (event, handler) {
            ko.utils.registerEventHandler(element, event, handler);
        };

        if (DEBUG && ko.bindingHandlers['textInput']['_forceUpdateOn']) {
            // Provide a way for tests to specify exactly which events are bound
            ko.utils.arrayForEach(ko.bindingHandlers['textInput']['_forceUpdateOn'], function(eventName) {
                if (eventName.slice(0,5) == 'after') {
                    onEvent(eventName.slice(5), deferUpdateModel);
                } else {
                    onEvent(eventName, updateModel);
                }
            });
        } else {
            if (ko.utils.ieVersion < 10) {
                // Internet Explorer <= 8 doesn't support the 'input' event, but does include 'propertychange' that fires whenever
                // any property of an element changes. Unlike 'input', it also fires if a property is changed from JavaScript code,
                // but that's an acceptable compromise for this binding. IE 9 does support 'input', but since it doesn't fire it
                // when using autocomplete, we'll use 'propertychange' for it also.
                onEvent('propertychange', function(event) {
                    if (event.propertyName === 'value') {
                        ieUpdateModel(event);
                    }
                });

                if (ko.utils.ieVersion == 8) {
                    // IE 8 has a bug where it fails to fire 'propertychange' on the first update following a value change from
                    // JavaScript code. It also doesn't fire if you clear the entire value. To fix this, we bind to the following
                    // events too.
                    onEvent('keyup', updateModel);      // A single keystoke
                    onEvent('keydown', updateModel);    // The first character when a key is held down
                }
                if (ko.utils.ieVersion >= 8) {
                    // Internet Explorer 9 doesn't fire the 'input' event when deleting text, including using
                    // the backspace, delete, or ctrl-x keys, clicking the 'x' to clear the input, dragging text
                    // out of the field, and cutting or deleting text using the context menu. 'selectionchange'
                    // can detect all of those except dragging text out of the field, for which we use 'dragend'.
                    // These are also needed in IE8 because of the bug described above.
                    registerForSelectionChangeEvent(element, ieUpdateModel);  // 'selectionchange' covers cut, paste, drop, delete, etc.
                    onEvent('dragend', deferUpdateModel);
                }
            } else {
                // All other supported browsers support the 'input' event, which fires whenever the content of the element is changed
                // through the user interface.
                onEvent('input', updateModel);

                if (safariVersion < 5 && ko.utils.tagNameLower(element) === "textarea") {
                    // Safari <5 doesn't fire the 'input' event for <textarea> elements (it does fire 'textInput'
                    // but only when typing). So we'll just catch as much as we can with keydown, cut, and paste.
                    onEvent('keydown', deferUpdateModel);
                    onEvent('paste', deferUpdateModel);
                    onEvent('cut', deferUpdateModel);
                } else if (operaVersion < 11) {
                    // Opera 10 doesn't always fire the 'input' event for cut, paste, undo & drop operations.
                    // We can try to catch some of those using 'keydown'.
                    onEvent('keydown', deferUpdateModel);
                } else if (firefoxVersion < 4.0) {
                    // Firefox <= 3.6 doesn't fire the 'input' event when text is filled in through autocomplete
                    onEvent('DOMAutoComplete', updateModel);

                    // Firefox <=3.5 doesn't fire the 'input' event when text is dropped into the input.
                    onEvent('dragdrop', updateModel);       // <3.5
                    onEvent('drop', updateModel);           // 3.5
                }
            }
        }

        // Bind to the change event so that we can catch programmatic updates of the value that fire this event.
        onEvent('change', updateModel);

        ko.computed(updateView, null, { disposeWhenNodeIsRemoved: element });
    }
};
ko.expressionRewriting.twoWayBindings['textInput'] = true;

// textinput is an alias for textInput
ko.bindingHandlers['textinput'] = {
    // preprocess is the only way to set up a full alias
    'preprocess': function (value, name, addBinding) {
        addBinding('textInput', value);
    }
};

})();ko.bindingHandlers['uniqueName'] = {
    'init': function (element, valueAccessor) {
        if (valueAccessor()) {
            var name = "ko_unique_" + (++ko.bindingHandlers['uniqueName'].currentIndex);
            ko.utils.setElementName(element, name);
        }
    }
};
ko.bindingHandlers['uniqueName'].currentIndex = 0;
ko.bindingHandlers['value'] = {
    'after': ['options', 'foreach'],
    'init': function (element, valueAccessor, allBindings) {
        // If the value binding is placed on a radio/checkbox, then just pass through to checkedValue and quit
        if (element.tagName.toLowerCase() == "input" && (element.type == "checkbox" || element.type == "radio")) {
            ko.applyBindingAccessorsToNode(element, { 'checkedValue': valueAccessor });
            return;
        }

        // Always catch "change" event; possibly other events too if asked
        var eventsToCatch = ["change"];
        var requestedEventsToCatch = allBindings.get("valueUpdate");
        var propertyChangedFired = false;
        var elementValueBeforeEvent = null;

        if (requestedEventsToCatch) {
            if (typeof requestedEventsToCatch == "string") // Allow both individual event names, and arrays of event names
                requestedEventsToCatch = [requestedEventsToCatch];
            ko.utils.arrayPushAll(eventsToCatch, requestedEventsToCatch);
            eventsToCatch = ko.utils.arrayGetDistinctValues(eventsToCatch);
        }

        var valueUpdateHandler = function() {
            elementValueBeforeEvent = null;
            propertyChangedFired = false;
            var modelValue = valueAccessor();
            var elementValue = ko.selectExtensions.readValue(element);
            ko.expressionRewriting.writeValueToProperty(modelValue, allBindings, 'value', elementValue);
        }

        // Workaround for https://github.com/SteveSanderson/knockout/issues/122
        // IE doesn't fire "change" events on textboxes if the user selects a value from its autocomplete list
        var ieAutoCompleteHackNeeded = ko.utils.ieVersion && element.tagName.toLowerCase() == "input" && element.type == "text"
                                       && element.autocomplete != "off" && (!element.form || element.form.autocomplete != "off");
        if (ieAutoCompleteHackNeeded && ko.utils.arrayIndexOf(eventsToCatch, "propertychange") == -1) {
            ko.utils.registerEventHandler(element, "propertychange", function () { propertyChangedFired = true });
            ko.utils.registerEventHandler(element, "focus", function () { propertyChangedFired = false });
            ko.utils.registerEventHandler(element, "blur", function() {
                if (propertyChangedFired) {
                    valueUpdateHandler();
                }
            });
        }

        ko.utils.arrayForEach(eventsToCatch, function(eventName) {
            // The syntax "after<eventname>" means "run the handler asynchronously after the event"
            // This is useful, for example, to catch "keydown" events after the browser has updated the control
            // (otherwise, ko.selectExtensions.readValue(this) will receive the control's value *before* the key event)
            var handler = valueUpdateHandler;
            if (ko.utils.stringStartsWith(eventName, "after")) {
                handler = function() {
                    // The elementValueBeforeEvent variable is non-null *only* during the brief gap between
                    // a keyX event firing and the valueUpdateHandler running, which is scheduled to happen
                    // at the earliest asynchronous opportunity. We store this temporary information so that
                    // if, between keyX and valueUpdateHandler, the underlying model value changes separately,
                    // we can overwrite that model value change with the value the user just typed. Otherwise,
                    // techniques like rateLimit can trigger model changes at critical moments that will
                    // override the user's inputs, causing keystrokes to be lost.
                    elementValueBeforeEvent = ko.selectExtensions.readValue(element);
                    ko.utils.setTimeout(valueUpdateHandler, 0);
                };
                eventName = eventName.substring("after".length);
            }
            ko.utils.registerEventHandler(element, eventName, handler);
        });

        var updateFromModel = function () {
            var newValue = ko.utils.unwrapObservable(valueAccessor());
            var elementValue = ko.selectExtensions.readValue(element);

            if (elementValueBeforeEvent !== null && newValue === elementValueBeforeEvent) {
                ko.utils.setTimeout(updateFromModel, 0);
                return;
            }

            var valueHasChanged = (newValue !== elementValue);

            if (valueHasChanged) {
                if (ko.utils.tagNameLower(element) === "select") {
                    var allowUnset = allBindings.get('valueAllowUnset');
                    var applyValueAction = function () {
                        ko.selectExtensions.writeValue(element, newValue, allowUnset);
                    };
                    applyValueAction();

                    if (!allowUnset && newValue !== ko.selectExtensions.readValue(element)) {
                        // If you try to set a model value that can't be represented in an already-populated dropdown, reject that change,
                        // because you're not allowed to have a model value that disagrees with a visible UI selection.
                        ko.dependencyDetection.ignore(ko.utils.triggerEvent, null, [element, "change"]);
                    } else {
                        // Workaround for IE6 bug: It won't reliably apply values to SELECT nodes during the same execution thread
                        // right after you've changed the set of OPTION nodes on it. So for that node type, we'll schedule a second thread
                        // to apply the value as well.
                        ko.utils.setTimeout(applyValueAction, 0);
                    }
                } else {
                    ko.selectExtensions.writeValue(element, newValue);
                }
            }
        };

        ko.computed(updateFromModel, null, { disposeWhenNodeIsRemoved: element });
    },
    'update': function() {} // Keep for backwards compatibility with code that may have wrapped value binding
};
ko.expressionRewriting.twoWayBindings['value'] = true;
ko.bindingHandlers['visible'] = {
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        var isCurrentlyVisible = !(element.style.display == "none");
        if (value && !isCurrentlyVisible)
            element.style.display = "";
        else if ((!value) && isCurrentlyVisible)
            element.style.display = "none";
    }
};
// 'click' is just a shorthand for the usual full-length event:{click:handler}
makeEventHandlerShortcut('click');
// If you want to make a custom template engine,
//
// [1] Inherit from this class (like ko.nativeTemplateEngine does)
// [2] Override 'renderTemplateSource', supplying a function with this signature:
//
//        function (templateSource, bindingContext, options) {
//            // - templateSource.text() is the text of the template you should render
//            // - bindingContext.$data is the data you should pass into the template
//            //   - you might also want to make bindingContext.$parent, bindingContext.$parents,
//            //     and bindingContext.$root available in the template too
//            // - options gives you access to any other properties set on "data-bind: { template: options }"
//            // - templateDocument is the document object of the template
//            //
//            // Return value: an array of DOM nodes
//        }
//
// [3] Override 'createJavaScriptEvaluatorBlock', supplying a function with this signature:
//
//        function (script) {
//            // Return value: Whatever syntax means "Evaluate the JavaScript statement 'script' and output the result"
//            //               For example, the jquery.tmpl template engine converts 'someScript' to '${ someScript }'
//        }
//
//     This is only necessary if you want to allow data-bind attributes to reference arbitrary template variables.
//     If you don't want to allow that, you can set the property 'allowTemplateRewriting' to false (like ko.nativeTemplateEngine does)
//     and then you don't need to override 'createJavaScriptEvaluatorBlock'.

ko.templateEngine = function () { };

ko.templateEngine.prototype['renderTemplateSource'] = function (templateSource, bindingContext, options, templateDocument) {
    throw new Error("Override renderTemplateSource");
};

ko.templateEngine.prototype['createJavaScriptEvaluatorBlock'] = function (script) {
    throw new Error("Override createJavaScriptEvaluatorBlock");
};

ko.templateEngine.prototype['makeTemplateSource'] = function(template, templateDocument) {
    // Named template
    if (typeof template == "string") {
        templateDocument = templateDocument || document;
        var elem = templateDocument.getElementById(template);
        if (!elem)
            throw new Error("Cannot find template with ID " + template);
        return new ko.templateSources.domElement(elem);
    } else if ((template.nodeType == 1) || (template.nodeType == 8)) {
        // Anonymous template
        return new ko.templateSources.anonymousTemplate(template);
    } else
        throw new Error("Unknown template type: " + template);
};

ko.templateEngine.prototype['renderTemplate'] = function (template, bindingContext, options, templateDocument) {
    var templateSource = this['makeTemplateSource'](template, templateDocument);
    return this['renderTemplateSource'](templateSource, bindingContext, options, templateDocument);
};

ko.templateEngine.prototype['isTemplateRewritten'] = function (template, templateDocument) {
    // Skip rewriting if requested
    if (this['allowTemplateRewriting'] === false)
        return true;
    return this['makeTemplateSource'](template, templateDocument)['data']("isRewritten");
};

ko.templateEngine.prototype['rewriteTemplate'] = function (template, rewriterCallback, templateDocument) {
    var templateSource = this['makeTemplateSource'](template, templateDocument);
    var rewritten = rewriterCallback(templateSource['text']());
    templateSource['text'](rewritten);
    templateSource['data']("isRewritten", true);
};

ko.exportSymbol('templateEngine', ko.templateEngine);

ko.templateRewriting = (function () {
    var memoizeDataBindingAttributeSyntaxRegex = /(<([a-z]+\d*)(?:\s+(?!data-bind\s*=\s*)[a-z0-9\-]+(?:=(?:\"[^\"]*\"|\'[^\']*\'|[^>]*))?)*\s+)data-bind\s*=\s*(["'])([\s\S]*?)\3/gi;
    var memoizeVirtualContainerBindingSyntaxRegex = /<!--\s*ko\b\s*([\s\S]*?)\s*-->/g;

    function validateDataBindValuesForRewriting(keyValueArray) {
        var allValidators = ko.expressionRewriting.bindingRewriteValidators;
        for (var i = 0; i < keyValueArray.length; i++) {
            var key = keyValueArray[i]['key'];
            if (allValidators.hasOwnProperty(key)) {
                var validator = allValidators[key];

                if (typeof validator === "function") {
                    var possibleErrorMessage = validator(keyValueArray[i]['value']);
                    if (possibleErrorMessage)
                        throw new Error(possibleErrorMessage);
                } else if (!validator) {
                    throw new Error("This template engine does not support the '" + key + "' binding within its templates");
                }
            }
        }
    }

    function constructMemoizedTagReplacement(dataBindAttributeValue, tagToRetain, nodeName, templateEngine) {
        var dataBindKeyValueArray = ko.expressionRewriting.parseObjectLiteral(dataBindAttributeValue);
        validateDataBindValuesForRewriting(dataBindKeyValueArray);
        var rewrittenDataBindAttributeValue = ko.expressionRewriting.preProcessBindings(dataBindKeyValueArray, {'valueAccessors':true});

        // For no obvious reason, Opera fails to evaluate rewrittenDataBindAttributeValue unless it's wrapped in an additional
        // anonymous function, even though Opera's built-in debugger can evaluate it anyway. No other browser requires this
        // extra indirection.
        var applyBindingsToNextSiblingScript =
            "ko.__tr_ambtns(function($context,$element){return(function(){return{ " + rewrittenDataBindAttributeValue + " } })()},'" + nodeName.toLowerCase() + "')";
        return templateEngine['createJavaScriptEvaluatorBlock'](applyBindingsToNextSiblingScript) + tagToRetain;
    }

    return {
        ensureTemplateIsRewritten: function (template, templateEngine, templateDocument) {
            if (!templateEngine['isTemplateRewritten'](template, templateDocument))
                templateEngine['rewriteTemplate'](template, function (htmlString) {
                    return ko.templateRewriting.memoizeBindingAttributeSyntax(htmlString, templateEngine);
                }, templateDocument);
        },

        memoizeBindingAttributeSyntax: function (htmlString, templateEngine) {
            return htmlString.replace(memoizeDataBindingAttributeSyntaxRegex, function () {
                return constructMemoizedTagReplacement(/* dataBindAttributeValue: */ arguments[4], /* tagToRetain: */ arguments[1], /* nodeName: */ arguments[2], templateEngine);
            }).replace(memoizeVirtualContainerBindingSyntaxRegex, function() {
                return constructMemoizedTagReplacement(/* dataBindAttributeValue: */ arguments[1], /* tagToRetain: */ "<!-- ko -->", /* nodeName: */ "#comment", templateEngine);
            });
        },

        applyMemoizedBindingsToNextSibling: function (bindings, nodeName) {
            return ko.memoization.memoize(function (domNode, bindingContext) {
                var nodeToBind = domNode.nextSibling;
                if (nodeToBind && nodeToBind.nodeName.toLowerCase() === nodeName) {
                    ko.applyBindingAccessorsToNode(nodeToBind, bindings, bindingContext);
                }
            });
        }
    }
})();


// Exported only because it has to be referenced by string lookup from within rewritten template
ko.exportSymbol('__tr_ambtns', ko.templateRewriting.applyMemoizedBindingsToNextSibling);
(function() {
    // A template source represents a read/write way of accessing a template. This is to eliminate the need for template loading/saving
    // logic to be duplicated in every template engine (and means they can all work with anonymous templates, etc.)
    //
    // Two are provided by default:
    //  1. ko.templateSources.domElement       - reads/writes the text content of an arbitrary DOM element
    //  2. ko.templateSources.anonymousElement - uses ko.utils.domData to read/write text *associated* with the DOM element, but
    //                                           without reading/writing the actual element text content, since it will be overwritten
    //                                           with the rendered template output.
    // You can implement your own template source if you want to fetch/store templates somewhere other than in DOM elements.
    // Template sources need to have the following functions:
    //   text() 			- returns the template text from your storage location
    //   text(value)		- writes the supplied template text to your storage location
    //   data(key)			- reads values stored using data(key, value) - see below
    //   data(key, value)	- associates "value" with this template and the key "key". Is used to store information like "isRewritten".
    //
    // Optionally, template sources can also have the following functions:
    //   nodes()            - returns a DOM element containing the nodes of this template, where available
    //   nodes(value)       - writes the given DOM element to your storage location
    // If a DOM element is available for a given template source, template engines are encouraged to use it in preference over text()
    // for improved speed. However, all templateSources must supply text() even if they don't supply nodes().
    //
    // Once you've implemented a templateSource, make your template engine use it by subclassing whatever template engine you were
    // using and overriding "makeTemplateSource" to return an instance of your custom template source.

    ko.templateSources = {};

    // ---- ko.templateSources.domElement -----

    // template types
    var templateScript = 1,
        templateTextArea = 2,
        templateTemplate = 3,
        templateElement = 4;

    ko.templateSources.domElement = function(element) {
        this.domElement = element;

        if (element) {
            var tagNameLower = ko.utils.tagNameLower(element);
            this.templateType =
                tagNameLower === "script" ? templateScript :
                tagNameLower === "textarea" ? templateTextArea :
                    // For browsers with proper <template> element support, where the .content property gives a document fragment
                tagNameLower == "template" && element.content && element.content.nodeType === 11 ? templateTemplate :
                templateElement;
        }
    }

    ko.templateSources.domElement.prototype['text'] = function(/* valueToWrite */) {
        var elemContentsProperty = this.templateType === templateScript ? "text"
                                 : this.templateType === templateTextArea ? "value"
                                 : "innerHTML";

        if (arguments.length == 0) {
            return this.domElement[elemContentsProperty];
        } else {
            var valueToWrite = arguments[0];
            if (elemContentsProperty === "innerHTML")
                ko.utils.setHtml(this.domElement, valueToWrite);
            else
                this.domElement[elemContentsProperty] = valueToWrite;
        }
    };

    var dataDomDataPrefix = ko.utils.domData.nextKey() + "_";
    ko.templateSources.domElement.prototype['data'] = function(key /*, valueToWrite */) {
        if (arguments.length === 1) {
            return ko.utils.domData.get(this.domElement, dataDomDataPrefix + key);
        } else {
            ko.utils.domData.set(this.domElement, dataDomDataPrefix + key, arguments[1]);
        }
    };

    var templatesDomDataKey = ko.utils.domData.nextKey();
    function getTemplateDomData(element) {
        return ko.utils.domData.get(element, templatesDomDataKey) || {};
    }
    function setTemplateDomData(element, data) {
        ko.utils.domData.set(element, templatesDomDataKey, data);
    }

    ko.templateSources.domElement.prototype['nodes'] = function(/* valueToWrite */) {
        var element = this.domElement;
        if (arguments.length == 0) {
            var templateData = getTemplateDomData(element),
                containerData = templateData.containerData;
            return containerData || (
                this.templateType === templateTemplate ? element.content :
                this.templateType === templateElement ? element :
                undefined);
        } else {
            var valueToWrite = arguments[0];
            setTemplateDomData(element, {containerData: valueToWrite});
        }
    };

    // ---- ko.templateSources.anonymousTemplate -----
    // Anonymous templates are normally saved/retrieved as DOM nodes through "nodes".
    // For compatibility, you can also read "text"; it will be serialized from the nodes on demand.
    // Writing to "text" is still supported, but then the template data will not be available as DOM nodes.

    ko.templateSources.anonymousTemplate = function(element) {
        this.domElement = element;
    }
    ko.templateSources.anonymousTemplate.prototype = new ko.templateSources.domElement();
    ko.templateSources.anonymousTemplate.prototype.constructor = ko.templateSources.anonymousTemplate;
    ko.templateSources.anonymousTemplate.prototype['text'] = function(/* valueToWrite */) {
        if (arguments.length == 0) {
            var templateData = getTemplateDomData(this.domElement);
            if (templateData.textData === undefined && templateData.containerData)
                templateData.textData = templateData.containerData.innerHTML;
            return templateData.textData;
        } else {
            var valueToWrite = arguments[0];
            setTemplateDomData(this.domElement, {textData: valueToWrite});
        }
    };

    ko.exportSymbol('templateSources', ko.templateSources);
    ko.exportSymbol('templateSources.domElement', ko.templateSources.domElement);
    ko.exportSymbol('templateSources.anonymousTemplate', ko.templateSources.anonymousTemplate);
})();
(function () {
    var _templateEngine;
    ko.setTemplateEngine = function (templateEngine) {
        if ((templateEngine != undefined) && !(templateEngine instanceof ko.templateEngine))
            throw new Error("templateEngine must inherit from ko.templateEngine");
        _templateEngine = templateEngine;
    }

    function invokeForEachNodeInContinuousRange(firstNode, lastNode, action) {
        var node, nextInQueue = firstNode, firstOutOfRangeNode = ko.virtualElements.nextSibling(lastNode);
        while (nextInQueue && ((node = nextInQueue) !== firstOutOfRangeNode)) {
            nextInQueue = ko.virtualElements.nextSibling(node);
            action(node, nextInQueue);
        }
    }

    function activateBindingsOnContinuousNodeArray(continuousNodeArray, bindingContext) {
        // To be used on any nodes that have been rendered by a template and have been inserted into some parent element
        // Walks through continuousNodeArray (which *must* be continuous, i.e., an uninterrupted sequence of sibling nodes, because
        // the algorithm for walking them relies on this), and for each top-level item in the virtual-element sense,
        // (1) Does a regular "applyBindings" to associate bindingContext with this node and to activate any non-memoized bindings
        // (2) Unmemoizes any memos in the DOM subtree (e.g., to activate bindings that had been memoized during template rewriting)

        if (continuousNodeArray.length) {
            var firstNode = continuousNodeArray[0],
                lastNode = continuousNodeArray[continuousNodeArray.length - 1],
                parentNode = firstNode.parentNode,
                provider = ko.bindingProvider['instance'],
                preprocessNode = provider['preprocessNode'];

            if (preprocessNode) {
                invokeForEachNodeInContinuousRange(firstNode, lastNode, function(node, nextNodeInRange) {
                    var nodePreviousSibling = node.previousSibling;
                    var newNodes = preprocessNode.call(provider, node);
                    if (newNodes) {
                        if (node === firstNode)
                            firstNode = newNodes[0] || nextNodeInRange;
                        if (node === lastNode)
                            lastNode = newNodes[newNodes.length - 1] || nodePreviousSibling;
                    }
                });

                // Because preprocessNode can change the nodes, including the first and last nodes, update continuousNodeArray to match.
                // We need the full set, including inner nodes, because the unmemoize step might remove the first node (and so the real
                // first node needs to be in the array).
                continuousNodeArray.length = 0;
                if (!firstNode) { // preprocessNode might have removed all the nodes, in which case there's nothing left to do
                    return;
                }
                if (firstNode === lastNode) {
                    continuousNodeArray.push(firstNode);
                } else {
                    continuousNodeArray.push(firstNode, lastNode);
                    ko.utils.fixUpContinuousNodeArray(continuousNodeArray, parentNode);
                }
            }

            // Need to applyBindings *before* unmemoziation, because unmemoization might introduce extra nodes (that we don't want to re-bind)
            // whereas a regular applyBindings won't introduce new memoized nodes
            invokeForEachNodeInContinuousRange(firstNode, lastNode, function(node) {
                if (node.nodeType === 1 || node.nodeType === 8)
                    ko.applyBindings(bindingContext, node);
            });
            invokeForEachNodeInContinuousRange(firstNode, lastNode, function(node) {
                if (node.nodeType === 1 || node.nodeType === 8)
                    ko.memoization.unmemoizeDomNodeAndDescendants(node, [bindingContext]);
            });

            // Make sure any changes done by applyBindings or unmemoize are reflected in the array
            ko.utils.fixUpContinuousNodeArray(continuousNodeArray, parentNode);
        }
    }

    function getFirstNodeFromPossibleArray(nodeOrNodeArray) {
        return nodeOrNodeArray.nodeType ? nodeOrNodeArray
                                        : nodeOrNodeArray.length > 0 ? nodeOrNodeArray[0]
                                        : null;
    }

    function executeTemplate(targetNodeOrNodeArray, renderMode, template, bindingContext, options) {
        options = options || {};
        var firstTargetNode = targetNodeOrNodeArray && getFirstNodeFromPossibleArray(targetNodeOrNodeArray);
        var templateDocument = (firstTargetNode || template || {}).ownerDocument;
        var templateEngineToUse = (options['templateEngine'] || _templateEngine);
        ko.templateRewriting.ensureTemplateIsRewritten(template, templateEngineToUse, templateDocument);
        var renderedNodesArray = templateEngineToUse['renderTemplate'](template, bindingContext, options, templateDocument);

        // Loosely check result is an array of DOM nodes
        if ((typeof renderedNodesArray.length != "number") || (renderedNodesArray.length > 0 && typeof renderedNodesArray[0].nodeType != "number"))
            throw new Error("Template engine must return an array of DOM nodes");

        var haveAddedNodesToParent = false;
        switch (renderMode) {
            case "replaceChildren":
                ko.virtualElements.setDomNodeChildren(targetNodeOrNodeArray, renderedNodesArray);
                haveAddedNodesToParent = true;
                break;
            case "replaceNode":
                ko.utils.replaceDomNodes(targetNodeOrNodeArray, renderedNodesArray);
                haveAddedNodesToParent = true;
                break;
            case "ignoreTargetNode": break;
            default:
                throw new Error("Unknown renderMode: " + renderMode);
        }

        if (haveAddedNodesToParent) {
            activateBindingsOnContinuousNodeArray(renderedNodesArray, bindingContext);
            if (options['afterRender'])
                ko.dependencyDetection.ignore(options['afterRender'], null, [renderedNodesArray, bindingContext['$data']]);
        }

        return renderedNodesArray;
    }

    function resolveTemplateName(template, data, context) {
        // The template can be specified as:
        if (ko.isObservable(template)) {
            // 1. An observable, with string value
            return template();
        } else if (typeof template === 'function') {
            // 2. A function of (data, context) returning a string
            return template(data, context);
        } else {
            // 3. A string
            return template;
        }
    }

    ko.renderTemplate = function (template, dataOrBindingContext, options, targetNodeOrNodeArray, renderMode) {
        options = options || {};
        if ((options['templateEngine'] || _templateEngine) == undefined)
            throw new Error("Set a template engine before calling renderTemplate");
        renderMode = renderMode || "replaceChildren";

        if (targetNodeOrNodeArray) {
            var firstTargetNode = getFirstNodeFromPossibleArray(targetNodeOrNodeArray);

            var whenToDispose = function () { return (!firstTargetNode) || !ko.utils.domNodeIsAttachedToDocument(firstTargetNode); }; // Passive disposal (on next evaluation)
            var activelyDisposeWhenNodeIsRemoved = (firstTargetNode && renderMode == "replaceNode") ? firstTargetNode.parentNode : firstTargetNode;

            return ko.dependentObservable( // So the DOM is automatically updated when any dependency changes
                function () {
                    // Ensure we've got a proper binding context to work with
                    var bindingContext = (dataOrBindingContext && (dataOrBindingContext instanceof ko.bindingContext))
                        ? dataOrBindingContext
                        : new ko.bindingContext(ko.utils.unwrapObservable(dataOrBindingContext));

                    var templateName = resolveTemplateName(template, bindingContext['$data'], bindingContext),
                        renderedNodesArray = executeTemplate(targetNodeOrNodeArray, renderMode, templateName, bindingContext, options);

                    if (renderMode == "replaceNode") {
                        targetNodeOrNodeArray = renderedNodesArray;
                        firstTargetNode = getFirstNodeFromPossibleArray(targetNodeOrNodeArray);
                    }
                },
                null,
                { disposeWhen: whenToDispose, disposeWhenNodeIsRemoved: activelyDisposeWhenNodeIsRemoved }
            );
        } else {
            // We don't yet have a DOM node to evaluate, so use a memo and render the template later when there is a DOM node
            return ko.memoization.memoize(function (domNode) {
                ko.renderTemplate(template, dataOrBindingContext, options, domNode, "replaceNode");
            });
        }
    };

    ko.renderTemplateForEach = function (template, arrayOrObservableArray, options, targetNode, parentBindingContext) {
        // Since setDomNodeChildrenFromArrayMapping always calls executeTemplateForArrayItem and then
        // activateBindingsCallback for added items, we can store the binding context in the former to use in the latter.
        var arrayItemContext;

        // This will be called by setDomNodeChildrenFromArrayMapping to get the nodes to add to targetNode
        var executeTemplateForArrayItem = function (arrayValue, index) {
            // Support selecting template as a function of the data being rendered
            arrayItemContext = parentBindingContext['createChildContext'](arrayValue, options['as'], function(context) {
                context['$index'] = index;
            });

            var templateName = resolveTemplateName(template, arrayValue, arrayItemContext);
            return executeTemplate(null, "ignoreTargetNode", templateName, arrayItemContext, options);
        }

        // This will be called whenever setDomNodeChildrenFromArrayMapping has added nodes to targetNode
        var activateBindingsCallback = function(arrayValue, addedNodesArray, index) {
            activateBindingsOnContinuousNodeArray(addedNodesArray, arrayItemContext);
            if (options['afterRender'])
                options['afterRender'](addedNodesArray, arrayValue);

            // release the "cache" variable, so that it can be collected by
            // the GC when its value isn't used from within the bindings anymore.
            arrayItemContext = null;
        };

        return ko.dependentObservable(function () {
            var unwrappedArray = ko.utils.unwrapObservable(arrayOrObservableArray) || [];
            if (typeof unwrappedArray.length == "undefined") // Coerce single value into array
                unwrappedArray = [unwrappedArray];

            // Filter out any entries marked as destroyed
            var filteredArray = ko.utils.arrayFilter(unwrappedArray, function(item) {
                return options['includeDestroyed'] || item === undefined || item === null || !ko.utils.unwrapObservable(item['_destroy']);
            });

            // Call setDomNodeChildrenFromArrayMapping, ignoring any observables unwrapped within (most likely from a callback function).
            // If the array items are observables, though, they will be unwrapped in executeTemplateForArrayItem and managed within setDomNodeChildrenFromArrayMapping.
            ko.dependencyDetection.ignore(ko.utils.setDomNodeChildrenFromArrayMapping, null, [targetNode, filteredArray, executeTemplateForArrayItem, options, activateBindingsCallback]);

        }, null, { disposeWhenNodeIsRemoved: targetNode });
    };

    var templateComputedDomDataKey = ko.utils.domData.nextKey();
    function disposeOldComputedAndStoreNewOne(element, newComputed) {
        var oldComputed = ko.utils.domData.get(element, templateComputedDomDataKey);
        if (oldComputed && (typeof(oldComputed.dispose) == 'function'))
            oldComputed.dispose();
        ko.utils.domData.set(element, templateComputedDomDataKey, (newComputed && newComputed.isActive()) ? newComputed : undefined);
    }

    ko.bindingHandlers['template'] = {
        'init': function(element, valueAccessor) {
            // Support anonymous templates
            var bindingValue = ko.utils.unwrapObservable(valueAccessor());
            if (typeof bindingValue == "string" || bindingValue['name']) {
                // It's a named template - clear the element
                ko.virtualElements.emptyNode(element);
            } else if ('nodes' in bindingValue) {
                // We've been given an array of DOM nodes. Save them as the template source.
                // There is no known use case for the node array being an observable array (if the output
                // varies, put that behavior *into* your template - that's what templates are for), and
                // the implementation would be a mess, so assert that it's not observable.
                var nodes = bindingValue['nodes'] || [];
                if (ko.isObservable(nodes)) {
                    throw new Error('The "nodes" option must be a plain, non-observable array.');
                }
                var container = ko.utils.moveCleanedNodesToContainerElement(nodes); // This also removes the nodes from their current parent
                new ko.templateSources.anonymousTemplate(element)['nodes'](container);
            } else {
                // It's an anonymous template - store the element contents, then clear the element
                var templateNodes = ko.virtualElements.childNodes(element),
                    container = ko.utils.moveCleanedNodesToContainerElement(templateNodes); // This also removes the nodes from their current parent
                new ko.templateSources.anonymousTemplate(element)['nodes'](container);
            }
            return { 'controlsDescendantBindings': true };
        },
        'update': function (element, valueAccessor, allBindings, viewModel, bindingContext) {
            var value = valueAccessor(),
                dataValue,
                options = ko.utils.unwrapObservable(value),
                shouldDisplay = true,
                templateComputed = null,
                templateName;

            if (typeof options == "string") {
                templateName = value;
                options = {};
            } else {
                templateName = options['name'];

                // Support "if"/"ifnot" conditions
                if ('if' in options)
                    shouldDisplay = ko.utils.unwrapObservable(options['if']);
                if (shouldDisplay && 'ifnot' in options)
                    shouldDisplay = !ko.utils.unwrapObservable(options['ifnot']);

                dataValue = ko.utils.unwrapObservable(options['data']);
            }

            if ('foreach' in options) {
                // Render once for each data point (treating data set as empty if shouldDisplay==false)
                var dataArray = (shouldDisplay && options['foreach']) || [];
                templateComputed = ko.renderTemplateForEach(templateName || element, dataArray, options, element, bindingContext);
            } else if (!shouldDisplay) {
                ko.virtualElements.emptyNode(element);
            } else {
                // Render once for this single data point (or use the viewModel if no data was provided)
                var innerBindingContext = ('data' in options) ?
                    bindingContext['createChildContext'](dataValue, options['as']) :  // Given an explitit 'data' value, we create a child binding context for it
                    bindingContext;                                                        // Given no explicit 'data' value, we retain the same binding context
                templateComputed = ko.renderTemplate(templateName || element, innerBindingContext, options, element);
            }

            // It only makes sense to have a single template computed per element (otherwise which one should have its output displayed?)
            disposeOldComputedAndStoreNewOne(element, templateComputed);
        }
    };

    // Anonymous templates can't be rewritten. Give a nice error message if you try to do it.
    ko.expressionRewriting.bindingRewriteValidators['template'] = function(bindingValue) {
        var parsedBindingValue = ko.expressionRewriting.parseObjectLiteral(bindingValue);

        if ((parsedBindingValue.length == 1) && parsedBindingValue[0]['unknown'])
            return null; // It looks like a string literal, not an object literal, so treat it as a named template (which is allowed for rewriting)

        if (ko.expressionRewriting.keyValueArrayContainsKey(parsedBindingValue, "name"))
            return null; // Named templates can be rewritten, so return "no error"
        return "This template engine does not support anonymous templates nested within its templates";
    };

    ko.virtualElements.allowedBindings['template'] = true;
})();

ko.exportSymbol('setTemplateEngine', ko.setTemplateEngine);
ko.exportSymbol('renderTemplate', ko.renderTemplate);
// Go through the items that have been added and deleted and try to find matches between them.
ko.utils.findMovesInArrayComparison = function (left, right, limitFailedCompares) {
    if (left.length && right.length) {
        var failedCompares, l, r, leftItem, rightItem;
        for (failedCompares = l = 0; (!limitFailedCompares || failedCompares < limitFailedCompares) && (leftItem = left[l]); ++l) {
            for (r = 0; rightItem = right[r]; ++r) {
                if (leftItem['value'] === rightItem['value']) {
                    leftItem['moved'] = rightItem['index'];
                    rightItem['moved'] = leftItem['index'];
                    right.splice(r, 1);         // This item is marked as moved; so remove it from right list
                    failedCompares = r = 0;     // Reset failed compares count because we're checking for consecutive failures
                    break;
                }
            }
            failedCompares += r;
        }
    }
};

ko.utils.compareArrays = (function () {
    var statusNotInOld = 'added', statusNotInNew = 'deleted';

    // Simple calculation based on Levenshtein distance.
    function compareArrays(oldArray, newArray, options) {
        // For backward compatibility, if the third arg is actually a bool, interpret
        // it as the old parameter 'dontLimitMoves'. Newer code should use { dontLimitMoves: true }.
        options = (typeof options === 'boolean') ? { 'dontLimitMoves': options } : (options || {});
        oldArray = oldArray || [];
        newArray = newArray || [];

        if (oldArray.length < newArray.length)
            return compareSmallArrayToBigArray(oldArray, newArray, statusNotInOld, statusNotInNew, options);
        else
            return compareSmallArrayToBigArray(newArray, oldArray, statusNotInNew, statusNotInOld, options);
    }

    function compareSmallArrayToBigArray(smlArray, bigArray, statusNotInSml, statusNotInBig, options) {
        var myMin = Math.min,
            myMax = Math.max,
            editDistanceMatrix = [],
            smlIndex, smlIndexMax = smlArray.length,
            bigIndex, bigIndexMax = bigArray.length,
            compareRange = (bigIndexMax - smlIndexMax) || 1,
            maxDistance = smlIndexMax + bigIndexMax + 1,
            thisRow, lastRow,
            bigIndexMaxForRow, bigIndexMinForRow;

        for (smlIndex = 0; smlIndex <= smlIndexMax; smlIndex++) {
            lastRow = thisRow;
            editDistanceMatrix.push(thisRow = []);
            bigIndexMaxForRow = myMin(bigIndexMax, smlIndex + compareRange);
            bigIndexMinForRow = myMax(0, smlIndex - 1);
            for (bigIndex = bigIndexMinForRow; bigIndex <= bigIndexMaxForRow; bigIndex++) {
                if (!bigIndex)
                    thisRow[bigIndex] = smlIndex + 1;
                else if (!smlIndex)  // Top row - transform empty array into new array via additions
                    thisRow[bigIndex] = bigIndex + 1;
                else if (smlArray[smlIndex - 1] === bigArray[bigIndex - 1])
                    thisRow[bigIndex] = lastRow[bigIndex - 1];                  // copy value (no edit)
                else {
                    var northDistance = lastRow[bigIndex] || maxDistance;       // not in big (deletion)
                    var westDistance = thisRow[bigIndex - 1] || maxDistance;    // not in small (addition)
                    thisRow[bigIndex] = myMin(northDistance, westDistance) + 1;
                }
            }
        }

        var editScript = [], meMinusOne, notInSml = [], notInBig = [];
        for (smlIndex = smlIndexMax, bigIndex = bigIndexMax; smlIndex || bigIndex;) {
            meMinusOne = editDistanceMatrix[smlIndex][bigIndex] - 1;
            if (bigIndex && meMinusOne === editDistanceMatrix[smlIndex][bigIndex-1]) {
                notInSml.push(editScript[editScript.length] = {     // added
                    'status': statusNotInSml,
                    'value': bigArray[--bigIndex],
                    'index': bigIndex });
            } else if (smlIndex && meMinusOne === editDistanceMatrix[smlIndex - 1][bigIndex]) {
                notInBig.push(editScript[editScript.length] = {     // deleted
                    'status': statusNotInBig,
                    'value': smlArray[--smlIndex],
                    'index': smlIndex });
            } else {
                --bigIndex;
                --smlIndex;
                if (!options['sparse']) {
                    editScript.push({
                        'status': "retained",
                        'value': bigArray[bigIndex] });
                }
            }
        }

        // Set a limit on the number of consecutive non-matching comparisons; having it a multiple of
        // smlIndexMax keeps the time complexity of this algorithm linear.
        ko.utils.findMovesInArrayComparison(notInBig, notInSml, !options['dontLimitMoves'] && smlIndexMax * 10);

        return editScript.reverse();
    }

    return compareArrays;
})();

ko.exportSymbol('utils.compareArrays', ko.utils.compareArrays);
(function () {
    // Objective:
    // * Given an input array, a container DOM node, and a function from array elements to arrays of DOM nodes,
    //   map the array elements to arrays of DOM nodes, concatenate together all these arrays, and use them to populate the container DOM node
    // * Next time we're given the same combination of things (with the array possibly having mutated), update the container DOM node
    //   so that its children is again the concatenation of the mappings of the array elements, but don't re-map any array elements that we
    //   previously mapped - retain those nodes, and just insert/delete other ones

    // "callbackAfterAddingNodes" will be invoked after any "mapping"-generated nodes are inserted into the container node
    // You can use this, for example, to activate bindings on those nodes.

    function mapNodeAndRefreshWhenChanged(containerNode, mapping, valueToMap, callbackAfterAddingNodes, index) {
        // Map this array value inside a dependentObservable so we re-map when any dependency changes
        var mappedNodes = [];
        var dependentObservable = ko.dependentObservable(function() {
            var newMappedNodes = mapping(valueToMap, index, ko.utils.fixUpContinuousNodeArray(mappedNodes, containerNode)) || [];

            // On subsequent evaluations, just replace the previously-inserted DOM nodes
            if (mappedNodes.length > 0) {
                ko.utils.replaceDomNodes(mappedNodes, newMappedNodes);
                if (callbackAfterAddingNodes)
                    ko.dependencyDetection.ignore(callbackAfterAddingNodes, null, [valueToMap, newMappedNodes, index]);
            }

            // Replace the contents of the mappedNodes array, thereby updating the record
            // of which nodes would be deleted if valueToMap was itself later removed
            mappedNodes.length = 0;
            ko.utils.arrayPushAll(mappedNodes, newMappedNodes);
        }, null, { disposeWhenNodeIsRemoved: containerNode, disposeWhen: function() { return !ko.utils.anyDomNodeIsAttachedToDocument(mappedNodes); } });
        return { mappedNodes : mappedNodes, dependentObservable : (dependentObservable.isActive() ? dependentObservable : undefined) };
    }

    var lastMappingResultDomDataKey = ko.utils.domData.nextKey(),
        deletedItemDummyValue = ko.utils.domData.nextKey();

    ko.utils.setDomNodeChildrenFromArrayMapping = function (domNode, array, mapping, options, callbackAfterAddingNodes) {
        // Compare the provided array against the previous one
        array = array || [];
        options = options || {};
        var isFirstExecution = ko.utils.domData.get(domNode, lastMappingResultDomDataKey) === undefined;
        var lastMappingResult = ko.utils.domData.get(domNode, lastMappingResultDomDataKey) || [];
        var lastArray = ko.utils.arrayMap(lastMappingResult, function (x) { return x.arrayEntry; });
        var editScript = ko.utils.compareArrays(lastArray, array, options['dontLimitMoves']);

        // Build the new mapping result
        var newMappingResult = [];
        var lastMappingResultIndex = 0;
        var newMappingResultIndex = 0;

        var nodesToDelete = [];
        var itemsToProcess = [];
        var itemsForBeforeRemoveCallbacks = [];
        var itemsForMoveCallbacks = [];
        var itemsForAfterAddCallbacks = [];
        var mapData;

        function itemMovedOrRetained(editScriptIndex, oldPosition) {
            mapData = lastMappingResult[oldPosition];
            if (newMappingResultIndex !== oldPosition)
                itemsForMoveCallbacks[editScriptIndex] = mapData;
            // Since updating the index might change the nodes, do so before calling fixUpContinuousNodeArray
            mapData.indexObservable(newMappingResultIndex++);
            ko.utils.fixUpContinuousNodeArray(mapData.mappedNodes, domNode);
            newMappingResult.push(mapData);
            itemsToProcess.push(mapData);
        }

        function callCallback(callback, items) {
            if (callback) {
                for (var i = 0, n = items.length; i < n; i++) {
                    if (items[i]) {
                        ko.utils.arrayForEach(items[i].mappedNodes, function(node) {
                            callback(node, i, items[i].arrayEntry);
                        });
                    }
                }
            }
        }

        for (var i = 0, editScriptItem, movedIndex; editScriptItem = editScript[i]; i++) {
            movedIndex = editScriptItem['moved'];
            switch (editScriptItem['status']) {
                case "deleted":
                    if (movedIndex === undefined) {
                        mapData = lastMappingResult[lastMappingResultIndex];

                        // Stop tracking changes to the mapping for these nodes
                        if (mapData.dependentObservable) {
                            mapData.dependentObservable.dispose();
                            mapData.dependentObservable = undefined;
                        }

                        // Queue these nodes for later removal
                        if (ko.utils.fixUpContinuousNodeArray(mapData.mappedNodes, domNode).length) {
                            if (options['beforeRemove']) {
                                newMappingResult.push(mapData);
                                itemsToProcess.push(mapData);
                                if (mapData.arrayEntry === deletedItemDummyValue) {
                                    mapData = null;
                                } else {
                                    itemsForBeforeRemoveCallbacks[i] = mapData;
                                }
                            }
                            if (mapData) {
                                nodesToDelete.push.apply(nodesToDelete, mapData.mappedNodes);
                            }
                        }
                    }
                    lastMappingResultIndex++;
                    break;

                case "retained":
                    itemMovedOrRetained(i, lastMappingResultIndex++);
                    break;

                case "added":
                    if (movedIndex !== undefined) {
                        itemMovedOrRetained(i, movedIndex);
                    } else {
                        mapData = { arrayEntry: editScriptItem['value'], indexObservable: ko.observable(newMappingResultIndex++) };
                        newMappingResult.push(mapData);
                        itemsToProcess.push(mapData);
                        if (!isFirstExecution)
                            itemsForAfterAddCallbacks[i] = mapData;
                    }
                    break;
            }
        }

        // Store a copy of the array items we just considered so we can difference it next time
        ko.utils.domData.set(domNode, lastMappingResultDomDataKey, newMappingResult);

        // Call beforeMove first before any changes have been made to the DOM
        callCallback(options['beforeMove'], itemsForMoveCallbacks);

        // Next remove nodes for deleted items (or just clean if there's a beforeRemove callback)
        ko.utils.arrayForEach(nodesToDelete, options['beforeRemove'] ? ko.cleanNode : ko.removeNode);

        // Next add/reorder the remaining items (will include deleted items if there's a beforeRemove callback)
        for (var i = 0, nextNode = ko.virtualElements.firstChild(domNode), lastNode, node; mapData = itemsToProcess[i]; i++) {
            // Get nodes for newly added items
            if (!mapData.mappedNodes)
                ko.utils.extend(mapData, mapNodeAndRefreshWhenChanged(domNode, mapping, mapData.arrayEntry, callbackAfterAddingNodes, mapData.indexObservable));

            // Put nodes in the right place if they aren't there already
            for (var j = 0; node = mapData.mappedNodes[j]; nextNode = node.nextSibling, lastNode = node, j++) {
                if (node !== nextNode)
                    ko.virtualElements.insertAfter(domNode, node, lastNode);
            }

            // Run the callbacks for newly added nodes (for example, to apply bindings, etc.)
            if (!mapData.initialized && callbackAfterAddingNodes) {
                callbackAfterAddingNodes(mapData.arrayEntry, mapData.mappedNodes, mapData.indexObservable);
                mapData.initialized = true;
            }
        }

        // If there's a beforeRemove callback, call it after reordering.
        // Note that we assume that the beforeRemove callback will usually be used to remove the nodes using
        // some sort of animation, which is why we first reorder the nodes that will be removed. If the
        // callback instead removes the nodes right away, it would be more efficient to skip reordering them.
        // Perhaps we'll make that change in the future if this scenario becomes more common.
        callCallback(options['beforeRemove'], itemsForBeforeRemoveCallbacks);

        // Replace the stored values of deleted items with a dummy value. This provides two benefits: it marks this item
        // as already "removed" so we won't call beforeRemove for it again, and it ensures that the item won't match up
        // with an actual item in the array and appear as "retained" or "moved".
        for (i = 0; i < itemsForBeforeRemoveCallbacks.length; ++i) {
            if (itemsForBeforeRemoveCallbacks[i]) {
                itemsForBeforeRemoveCallbacks[i].arrayEntry = deletedItemDummyValue;
            }
        }

        // Finally call afterMove and afterAdd callbacks
        callCallback(options['afterMove'], itemsForMoveCallbacks);
        callCallback(options['afterAdd'], itemsForAfterAddCallbacks);
    }
})();

ko.exportSymbol('utils.setDomNodeChildrenFromArrayMapping', ko.utils.setDomNodeChildrenFromArrayMapping);
ko.nativeTemplateEngine = function () {
    this['allowTemplateRewriting'] = false;
}

ko.nativeTemplateEngine.prototype = new ko.templateEngine();
ko.nativeTemplateEngine.prototype.constructor = ko.nativeTemplateEngine;
ko.nativeTemplateEngine.prototype['renderTemplateSource'] = function (templateSource, bindingContext, options, templateDocument) {
    var useNodesIfAvailable = !(ko.utils.ieVersion < 9), // IE<9 cloneNode doesn't work properly
        templateNodesFunc = useNodesIfAvailable ? templateSource['nodes'] : null,
        templateNodes = templateNodesFunc ? templateSource['nodes']() : null;

    if (templateNodes) {
        return ko.utils.makeArray(templateNodes.cloneNode(true).childNodes);
    } else {
        var templateText = templateSource['text']();
        return ko.utils.parseHtmlFragment(templateText, templateDocument);
    }
};

ko.nativeTemplateEngine.instance = new ko.nativeTemplateEngine();
ko.setTemplateEngine(ko.nativeTemplateEngine.instance);

ko.exportSymbol('nativeTemplateEngine', ko.nativeTemplateEngine);
(function() {
    ko.jqueryTmplTemplateEngine = function () {
        // Detect which version of jquery-tmpl you're using. Unfortunately jquery-tmpl
        // doesn't expose a version number, so we have to infer it.
        // Note that as of Knockout 1.3, we only support jQuery.tmpl 1.0.0pre and later,
        // which KO internally refers to as version "2", so older versions are no longer detected.
        var jQueryTmplVersion = this.jQueryTmplVersion = (function() {
            if (!jQueryInstance || !(jQueryInstance['tmpl']))
                return 0;
            // Since it exposes no official version number, we use our own numbering system. To be updated as jquery-tmpl evolves.
            try {
                if (jQueryInstance['tmpl']['tag']['tmpl']['open'].toString().indexOf('__') >= 0) {
                    // Since 1.0.0pre, custom tags should append markup to an array called "__"
                    return 2; // Final version of jquery.tmpl
                }
            } catch(ex) { /* Apparently not the version we were looking for */ }

            return 1; // Any older version that we don't support
        })();

        function ensureHasReferencedJQueryTemplates() {
            if (jQueryTmplVersion < 2)
                throw new Error("Your version of jQuery.tmpl is too old. Please upgrade to jQuery.tmpl 1.0.0pre or later.");
        }

        function executeTemplate(compiledTemplate, data, jQueryTemplateOptions) {
            return jQueryInstance['tmpl'](compiledTemplate, data, jQueryTemplateOptions);
        }

        this['renderTemplateSource'] = function(templateSource, bindingContext, options, templateDocument) {
            templateDocument = templateDocument || document;
            options = options || {};
            ensureHasReferencedJQueryTemplates();

            // Ensure we have stored a precompiled version of this template (don't want to reparse on every render)
            var precompiled = templateSource['data']('precompiled');
            if (!precompiled) {
                var templateText = templateSource['text']() || "";
                // Wrap in "with($whatever.koBindingContext) { ... }"
                templateText = "{{ko_with $item.koBindingContext}}" + templateText + "{{/ko_with}}";

                precompiled = jQueryInstance['template'](null, templateText);
                templateSource['data']('precompiled', precompiled);
            }

            var data = [bindingContext['$data']]; // Prewrap the data in an array to stop jquery.tmpl from trying to unwrap any arrays
            var jQueryTemplateOptions = jQueryInstance['extend']({ 'koBindingContext': bindingContext }, options['templateOptions']);

            var resultNodes = executeTemplate(precompiled, data, jQueryTemplateOptions);
            resultNodes['appendTo'](templateDocument.createElement("div")); // Using "appendTo" forces jQuery/jQuery.tmpl to perform necessary cleanup work

            jQueryInstance['fragments'] = {}; // Clear jQuery's fragment cache to avoid a memory leak after a large number of template renders
            return resultNodes;
        };

        this['createJavaScriptEvaluatorBlock'] = function(script) {
            return "{{ko_code ((function() { return " + script + " })()) }}";
        };

        this['addTemplate'] = function(templateName, templateMarkup) {
            document.write("<script type='text/html' id='" + templateName + "'>" + templateMarkup + "<" + "/script>");
        };

        if (jQueryTmplVersion > 0) {
            jQueryInstance['tmpl']['tag']['ko_code'] = {
                open: "__.push($1 || '');"
            };
            jQueryInstance['tmpl']['tag']['ko_with'] = {
                open: "with($1) {",
                close: "} "
            };
        }
    };

    ko.jqueryTmplTemplateEngine.prototype = new ko.templateEngine();
    ko.jqueryTmplTemplateEngine.prototype.constructor = ko.jqueryTmplTemplateEngine;

    // Use this one by default *only if jquery.tmpl is referenced*
    var jqueryTmplTemplateEngineInstance = new ko.jqueryTmplTemplateEngine();
    if (jqueryTmplTemplateEngineInstance.jQueryTmplVersion > 0)
        ko.setTemplateEngine(jqueryTmplTemplateEngineInstance);

    ko.exportSymbol('jqueryTmplTemplateEngine', ko.jqueryTmplTemplateEngine);
})();
}));
}());
})();

},{}],2:[function(require,module,exports){
/*
 * Copyright 2013 Google, Inc.
 * Copyright 2015 Vivliostyle Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Vivliostyle core 2016.7.1-pre.63cd0166a4d2087023a7dc5080fe7f3e31e65da0
 */
(function(factory) {
    if (typeof define === "function" && define.amd) {
        // AMD
        define([], factory);
    } else if (typeof module === "object") {
        // Node.js
        var enclosingObject = {};
        module.exports = factory(enclosingObject);
    } else if (typeof exports === "object") {
        // CommonJS
        var enclosingObject = {};
        exports = factory(enclosingObject);
    } else {
        // Attach to the window object
        factory(window);
    }
})(function(enclosingObject) {
    enclosingObject = enclosingObject || {};
    var n,aa=this;function ba(a,b){var c=a.split("."),d=("undefined"!==typeof enclosingObject&&enclosingObject?enclosingObject:window)||aa;c[0]in d||!d.execScript||d.execScript("var "+c[0]);for(var e;c.length&&(e=c.shift());)c.length||void 0===b?d[e]?d=d[e]:d=d[e]={}:d[e]=b}
function t(a,b){function c(){}c.prototype=b.prototype;a.Vd=b.prototype;a.prototype=new c;a.prototype.constructor=a;a.Je=function(a,c,f){for(var g=Array(arguments.length-2),h=2;h<arguments.length;h++)g[h-2]=arguments[h];return b.prototype[c].apply(a,g)}};function ca(a,b,c,d){d=d[b];if(!d)throw Error("unknown writing-mode: "+b);b=d[c||"ltr"];if(!b)throw Error("unknown direction: "+c);for(c=0;c<b.length;c++)if(d=b[c],d=a.replace(d.f,d.b),d!==a)return d;return a}function ea(a){var b=fa,c={};Object.keys(b).forEach(function(d){var e=c[d]={},f=b[d];Object.keys(f).forEach(function(b){e[b]=f[b].map(function(b){return{f:new RegExp("(-?)"+(a?b.J:b.K)+"(-?)"),b:"$1"+(a?b.K:b.J)+"$2"}})})});return c}
var fa={"horizontal-tb":{ltr:[{J:"inline-start",K:"left"},{J:"inline-end",K:"right"},{J:"block-start",K:"top"},{J:"block-end",K:"bottom"},{J:"inline-size",K:"width"},{J:"block-size",K:"height"}],rtl:[{J:"inline-start",K:"right"},{J:"inline-end",K:"left"},{J:"block-start",K:"top"},{J:"block-end",K:"bottom"},{J:"inline-size",K:"width"},{J:"block-size",K:"height"}]},"vertical-rl":{ltr:[{J:"inline-start",K:"top"},{J:"inline-end",K:"bottom"},{J:"block-start",K:"right"},{J:"block-end",K:"left"},{J:"inline-size",
K:"height"},{J:"block-size",K:"width"}],rtl:[{J:"inline-start",K:"bottom"},{J:"inline-end",K:"top"},{J:"block-start",K:"right"},{J:"block-end",K:"left"},{J:"inline-size",K:"height"},{J:"block-size",K:"width"}]},"vertical-lr":{ltr:[{J:"inline-start",K:"top"},{J:"inline-end",K:"bottom"},{J:"block-start",K:"left"},{J:"block-end",K:"right"},{J:"inline-size",K:"height"},{J:"block-size",K:"width"}],rtl:[{J:"inline-start",K:"bottom"},{J:"inline-end",K:"top"},{J:"block-start",K:"left"},{J:"block-end",K:"right"},
{J:"inline-size",K:"height"},{J:"block-size",K:"width"}]}},ha=ea(!0),ia=ea(!1),ja={"horizontal-tb":[{J:"line-left",K:"left"},{J:"line-right",K:"right"},{J:"over",K:"top"},{J:"under",K:"bottom"}],"vertical-rl":[{J:"line-left",K:"top"},{J:"line-right",K:"bottom"},{J:"over",K:"right"},{J:"under",K:"left"}],"vertical-lr":[{J:"line-left",K:"top"},{J:"line-right",K:"bottom"},{J:"over",K:"right"},{J:"under",K:"left"}]};var ka=!1,la={Be:"ltr",Ce:"rtl"};ba("vivliostyle.constants.PageProgression",la);la.LTR="ltr";la.RTL="rtl";var na={Wd:"left",Xd:"right"};ba("vivliostyle.constants.PageSide",na);na.LEFT="left";na.RIGHT="right";var oa={LOADING:"loading",Ae:"interactive",xe:"complete"};ba("vivliostyle.constants.ReadyState",oa);oa.LOADING="loading";oa.INTERACTIVE="interactive";oa.COMPLETE="complete";function pa(a){var b=a.error,c=b&&(b.frameTrace||b.stack);a=[].concat(a.messages);b&&(0<a.length&&(a=a.concat(["\n"])),a=a.concat([b.toString()]),c&&(a=a.concat(["\n"]).concat(c)));return a}function qa(a){a=Array.b(a);var b=null;a[0]instanceof Error&&(b=a.shift());return{error:b,messages:a}}function ra(a){function b(a){return function(b){return a.apply(c,b)}}var c=a||console;this.f=b(c.debug||c.log);this.h=b(c.info||c.log);this.j=b(c.warn||c.log);this.g=b(c.error||c.log);this.d={}}
function sa(a,b,c){(a=a.d[b])&&a.forEach(function(a){a(c)})}function ta(a,b){var c=u,d=c.d[a];d||(d=c.d[a]=[]);d.push(b)}ra.prototype.debug=function(a){var b=qa(arguments);this.f(pa(b));sa(this,1,b)};ra.prototype.e=function(a){var b=qa(arguments);this.h(pa(b));sa(this,2,b)};ra.prototype.b=function(a){var b=qa(arguments);this.j(pa(b));sa(this,3,b)};ra.prototype.error=function(a){var b=qa(arguments);this.g(pa(b));sa(this,4,b)};var u=new ra;function ua(a){var b=a.match(/^([^#]*)/);return b?b[1]:a}var va=window.location.href;
function wa(a,b){if(!b||a.match(/^\w{2,}:/))return a.toLowerCase().match("^javascript:")?"#":a;b.match(/^\w{2,}:\/\/[^\/]+$/)&&(b+="/");var c;if(a.match(/^\/\//))return(c=b.match(/^(\w{2,}:)\/\//))?c[1]+a:a;if(a.match(/^\//))return(c=b.match(/^(\w{2,}:\/\/[^\/]+)\//))?c[1]+a:a;a.match(/^\.(\/|$)/)&&(a=a.substr(1));c=b;var d=c.match(/^([^#?]*)/);b=d?d[1]:c;if(a.match(/^\#/))return b+a;c=b.lastIndexOf("/");if(0>c)return a;for(d=b.substr(0,c+1)+a;;){c=d.indexOf("/../");if(0>=c)break;var e=d.lastIndexOf("/",
c-1);if(0>=e)break;d=d.substr(0,e)+d.substr(c+3)}return d.replace(/\/(\.\/)+/g,"/")}function xa(a){a=new RegExp("#(.*&)?"+za(a)+"=([^#&]*)");return(a=window.location.href.match(a))?a[2]:null}function Aa(a,b){var c=new RegExp("#(.*&)?"+za("f")+"=([^#&]*)"),d=a.match(c);return d?(c=d[2].length,d=d.index+d[0].length-c,a.substr(0,d)+b+a.substr(d+c)):a.match(/#/)?a+"&f="+b:a+"#f="+b}function Ba(a){return null==a?a:a.toString()}function Ca(){this.b=[null]}
Ca.prototype.length=function(){return this.b.length-1};function Da(a,b){a&&(b="-"+b,a=a.replace(/-/g,""),"moz"===a&&(a="Moz"));return a+b.replace(/-[a-z]/g,function(a){return a.substr(1).toUpperCase()})}var Ea=" -webkit- -moz- -ms- -o- -epub-".split(" "),Fa={};
function Ga(a,b){if("writing-mode"===b){var c=document.createElement("span");if("-ms-"===a)return c.style.setProperty(a+b,"tb-rl"),"tb-rl"===c.style["writing-mode"];c.style.setProperty(a+b,"vertical-rl");return"vertical-rl"===c.style[a+b]}return"string"===typeof document.documentElement.style[Da(a,b)]}
function Ha(a){var b=Fa[a];if(b||null===b)return b;switch(a){case "writing-mode":if(Ga("-ms-","writing-mode"))return Fa[a]="-ms-writing-mode";break;case "filter":if(Ga("-webkit-","filter"))return Fa[a]="-webkit-filter"}for(b=0;b<Ea.length;b++){var c=Ea[b];if(Ga(c,a))return b=c+a,Fa[a]=b}u.b("Property not supported by the browser: ",a);return Fa[a]=null}
function v(a,b,c){try{var d=Ha(b);if(d){if("-ms-writing-mode"===d)switch(c){case "horizontal-tb":c="lr-tb";break;case "vertical-rl":c="tb-rl";break;case "vertical-lr":c="tb-lr"}a&&a.style&&a.style.setProperty(d,c)}}catch(e){u.b(e)}}function Ia(a,b,c){try{return a.style.getPropertyValue(Fa[b]||b)}catch(d){}return c||""}function Ja(){this.b=[]}Ja.prototype.append=function(a){this.b.push(a);return this};Ja.prototype.toString=function(){var a=this.b.join("");this.b=[a];return a};
function Ka(a){return"\\"+a.charCodeAt(0).toString(16)+" "}function Ma(a){return a.replace(/[^-_a-zA-Z0-9\u0080-\uFFFF]/g,Ka)}function Na(a){return a.replace(/[\u0000-\u001F"]/g,Ka)}function Oa(a){return a.replace(/[\s+&?=#\u007F-\uFFFF]+/g,encodeURIComponent)}function Pa(a){return!!a.match(/^[a-zA-Z\u009E\u009F\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u037B-\u037D\u0386\u0388-\u0482\u048A-\u0527]$/)}function Qa(a){return"\\u"+(65536|a.charCodeAt(0)).toString(16).substr(1)}
function za(a){return a.replace(/[^-a-zA-Z0-9_]/g,Qa)}function Ra(a){if(!a)throw"Assert failed";}function Sa(a,b){for(var c=0,d=a;;){Ra(c<=d);Ra(0==c||!b(c-1));Ra(d==a||b(d));if(c==d)return c;var e=c+d>>1;b(e)?d=e:c=e+1}}function Ta(a,b){return a-b}function Ua(a,b){for(var c={},d=0;d<a.length;d++){var e=a[d],f=b(e);f&&!c[f]&&(c[f]=e)}return c}var Va={};function Wa(a,b){for(var c={},d=0;d<a.length;d++){var e=a[d],f=b(e);f&&(c[f]?c[f].push(e):c[f]=[e])}return c}
function Xa(a,b){for(var c=Array(a.length),d=0;d<a.length;d++)c[d]=b(a[d],d);return c}function Ya(a,b){var c={},d;for(d in a)c[d]=b(a[d],d);return c}function Za(){this.f={}}function $a(a,b){var c=a.f[b.type];if(c){b.target=a;b.currentTarget=a;for(var d=0;d<c.length;d++)c[d](b)}}Za.prototype.addEventListener=function(a,b,c){c||((c=this.f[a])?c.push(b):this.f[a]=[b])};Za.prototype.removeEventListener=function(a,b,c){!c&&(a=this.f[a])&&(b=a.indexOf(b),0<=b&&a.splice(b,1))};var ab=null;function bb(a){return 1==a.nodeType&&(a=a.getAttribute("id"))&&a.match(/^[-a-zA-Z_0-9.\u007F-\uFFFF]+$/)?a:null}function cb(a){return"^"+a}function db(a){return a.substr(1)}function eb(a){return a?a.replace(/\^[\[\]\(\),=;^]/g,db):a}
function fb(a){for(var b={};a;){var c=a.match(/^;([^;=]+)=(([^;]|\^;)*)/);if(!c)break;var d=c[1],e;a:{e=c[2];var f=[];do{var g=e.match(/^(\^,|[^,])*/),h=eb(g[0]);e=e.substr(g[0].length+1);if(!e&&!f.length){e=h;break a}f.push(h)}while(e);e=f}b[d]=e;a=a.substr(c[0].length)}return b}function gb(){}gb.prototype.e=function(a){a.append("!")};gb.prototype.f=function(){return!1};function hb(a,b,c){this.index=a;this.id=b;this.Za=c}
hb.prototype.e=function(a){a.append("/");a.append(this.index.toString());if(this.id||this.Za)a.append("["),this.id&&a.append(this.id),this.Za&&(a.append(";s="),a.append(this.Za)),a.append("]")};
hb.prototype.f=function(a){if(1!=a.ga.nodeType)throw Error("E_CFI_NOT_ELEMENT");var b=a.ga,c=b.children,d=c.length,e=Math.floor(this.index/2)-1;0>e||0==d?(c=b.firstChild,a.ga=c||b):(c=c[Math.min(e,d-1)],this.index&1&&((b=c.nextSibling)&&1!=b.nodeType?c=b:a.I=!0),a.ga=c);if(this.id&&(a.I||this.id!=bb(a.ga)))throw Error("E_CFI_ID_MISMATCH");a.Za=this.Za;return!0};function ib(a,b,c,d){this.offset=a;this.d=b;this.b=c;this.Za=d}
ib.prototype.f=function(a){if(0<this.offset&&!a.I){for(var b=this.offset,c=a.ga;;){var d=c.nodeType;if(1==d)break;var e=c.nextSibling;if(3<=d&&5>=d){d=c.textContent.length;if(b<=d)break;if(!e){b=d;break}b-=d}if(!e){b=0;break}c=e}a.ga=c;a.offset=b}a.Za=this.Za;return!0};
ib.prototype.e=function(a){a.append(":");a.append(this.offset.toString());if(this.d||this.b||this.Za){a.append("[");if(this.d||this.b)this.d&&a.append(this.d.replace(/[\[\]\(\),=;^]/g,cb)),a.append(","),this.b&&a.append(this.b.replace(/[\[\]\(\),=;^]/g,cb));this.Za&&(a.append(";s="),a.append(this.Za));a.append("]")}};function jb(){this.ha=null}
function kb(a,b){var c=b.match(/^#?epubcfi\((.*)\)$/);if(!c)throw Error("E_CFI_NOT_CFI");for(var d=c[1],e=0,f=[];;)switch(d.charAt(e)){case "/":e++;c=d.substr(e).match(/^(0|[1-9][0-9]*)(\[([-a-zA-Z_0-9.\u007F-\uFFFF]+)(;([^\]]|\^\])*)?\])?/);if(!c)throw Error("E_CFI_NUMBER_EXPECTED");var e=e+c[0].length,g=parseInt(c[1],10),h=c[3],c=fb(c[4]);f.push(new hb(g,h,Ba(c.s)));break;case ":":e++;c=d.substr(e).match(/^(0|[1-9][0-9]*)(\[((([^\];,]|\^[\];,])*)(,(([^\];,]|\^[\];,])*))?)(;([^]]|\^\])*)?\])?/);
if(!c)throw Error("E_CFI_NUMBER_EXPECTED");e+=c[0].length;g=parseInt(c[1],10);(h=c[4])&&(h=eb(h));var l=c[7];l&&(l=eb(l));c=fb(c[10]);f.push(new ib(g,h,l,Ba(c.s)));break;case "!":e++;f.push(new gb);break;case "~":case "@":case "":a.ha=f;return;default:throw Error("E_CFI_PARSE_ERROR");}}function lb(a,b){for(var c={ga:b.documentElement,offset:0,I:!1,Za:null,ec:null},d=0;d<a.ha.length;d++)if(!a.ha[d].f(c)){++d<a.ha.length&&(c.ec=new jb,c.ec.ha=a.ha.slice(d));break}return c}
jb.prototype.trim=function(a,b){return a.replace(/\s+/g," ").match(b?/^[ -\uD7FF\uE000-\uFFFF]{0,8}/:/[ -\uD7FF\uE000-\uFFFF]{0,8}$/)[0].replace(/^\s/,"").replace(/\s$/,"")};
function mb(a,b,c){for(var d=!1,e=null,f=[],g=b.parentNode,h="",l="";b;){switch(b.nodeType){case 3:case 4:case 5:var k=b.textContent,m=k.length;d?(c+=m,h||(h=k)):(c>m&&(c=m),d=!0,h=k.substr(0,c),l=k.substr(c));b=b.previousSibling;continue;case 8:b=b.previousSibling;continue}break}if(0<c||h||l)h=a.trim(h,!1),l=a.trim(l,!0),f.push(new ib(c,h,l,e)),e=null;for(;g&&g&&9!=g.nodeType;){c=d?null:bb(b);for(d=d?1:0;b;)1==b.nodeType&&(d+=2),b=b.previousSibling;f.push(new hb(d,c,e));e=null;b=g;g=g.parentNode;
d=!1}f.reverse();a.ha?(f.push(new gb),a.ha=f.concat(a.ha)):a.ha=f}jb.prototype.toString=function(){if(!this.ha)return"";var a=new Ja;a.append("epubcfi(");for(var b=0;b<this.ha.length;b++)this.ha[b].e(a);a.append(")");return a.toString()};function nb(a){a=a.substr(1);if(a.match(/^[^0-9a-fA-F\n\r]$/))return a;a=parseInt(a,16);return isNaN(a)?"":65535>=a?String.fromCharCode(a):1114111>=a?String.fromCharCode(55296|a>>10&1023,56320|a&1023):"\ufffd"}function ob(a){return a.replace(/\\([0-9a-fA-F]{0,6}(\r\n|[ \n\r\t\f])?|[^0-9a-fA-F\n\r])/g,nb)}function pb(){this.type=0;this.b=!1;this.C=0;this.text="";this.position=0}
function qb(a,b){var c=Array(128),d;for(d=0;128>d;d++)c[d]=a;c[NaN]=35==a?35:72;for(d=0;d<b.length;d+=2)c[b[d]]=b[d+1];return c}var rb=[72,72,72,72,72,72,72,72,72,1,1,72,1,1,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,1,4,34,6,7,8,9,33,10,11,12,13,14,15,16,17,2,2,2,2,2,2,2,2,2,2,18,19,20,21,22,23,24,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,25,29,26,30,3,72,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,27,31,28,32,72];rb[NaN]=80;
var sb=[43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,52,43,43,43,43,39,43,43,39,39,39,39,39,39,39,39,39,39,43,43,43,43,43,43,43,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,43,44,43,43,39,43,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,43,43,43,43,43];sb[NaN]=43;
var tb=[72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,78,59,72,59,59,59,59,59,59,59,59,59,59,72,72,72,72,72,72,72,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,72,61,72,72,78,72,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,72,72,72,72,72];sb[NaN]=43;
var ub=[35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,57,59,35,58,58,58,58,58,58,58,58,58,58,35,35,35,35,35,35,35,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,35,61,35,35,60,35,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,35,35,35,35,35];ub[NaN]=35;
var vb=[45,45,45,45,45,45,45,45,45,73,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,73,45,45,45,45,45,45,45,53,45,45,45,45,45,45,45,39,39,39,39,39,39,39,39,39,39,45,45,45,45,45,45,45,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,45,44,45,45,39,45,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,45,45,45,45,45];vb[NaN]=45;
var wb=[37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,41,37,37,37,37,37,37,37,37,42,37,39,39,39,39,39,39,39,39,39,39,37,37,37,37,37,37,37,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,37,37,37,37,40,37,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,37,37,37,37,37];wb[NaN]=37;
var xb=[38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,41,38,38,38,38,38,38,38,38,38,38,39,39,39,39,39,39,39,39,39,39,38,38,38,38,38,38,38,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,38,38,38,38,40,38,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,38,38,38,38,38];xb[NaN]=38;
var yb=qb(35,[61,36]),zb=qb(35,[58,77]),Ab=qb(35,[61,36,124,50]),Bb=qb(35,[38,51]),Cb=qb(35,[42,54]),Db=qb(39,[42,55]),Eb=qb(54,[42,55,47,56]),Fb=qb(62,[62,56]),Gb=qb(35,[61,36,33,70]),Hb=qb(62,[45,71]),Ib=qb(63,[45,56]),Jb=qb(76,[9,72,10,72,13,72,32,72]),Kb=qb(39,[39,46,10,72,13,72,92,48]),Mb=qb(39,[34,46,10,72,13,72,92,49]),Nb=qb(39,[39,47,10,74,13,74,92,48]),Ob=qb(39,[34,47,10,74,13,74,92,49]),Pb=qb(64,[9,39,32,39,34,66,39,65,41,72,10,39,13,39]),Qb=qb(39,[41,67,9,79,10,79,13,79,32,79,92,75,40,
72,91,72,93,72,123,72,125,72,NaN,67]),Rb=qb(39,[39,68,10,74,13,74,92,75,NaN,67]),Sb=qb(39,[34,68,10,74,13,74,92,75,NaN,67]),Tb=qb(72,[9,39,10,39,13,39,32,39,41,69]);function Ub(a,b){this.h=b;this.e=15;this.j=a;this.g=Array(this.e+1);this.b=-1;for(var c=this.position=this.d=this.f=0;c<=this.e;c++)this.g[c]=new pb}function x(a){a.f==a.d&&Vb(a);return a.g[a.d]}function z(a,b){(a.f-a.d&a.e)<=b&&Vb(a);return a.g[a.d+b&a.e]}function A(a){a.d=a.d+1&a.e}
function Wb(a){if(0>a.b)throw Error("F_CSSTOK_BAD_CALL reset");a.d=a.b;a.b=-1}Ub.prototype.error=function(a,b,c){this.h&&this.h.error(c,b)};
function Vb(a){var b=a.f,c=0<=a.b?a.b:a.d,d=a.e;b>=c?c+=d:c--;if(c==b){if(0>a.b)throw Error("F_CSSTOK_INTERNAL");for(var b=2*(a.e+1)-1,c=Array(b+1),d=a.b,e=0;d!=a.f;)c[e]=a.g[d],d==a.d&&(a.d=e),d=d+1&a.e,e++;a.b=0;a.f=e;a.e=b;for(a.g=c;e<=b;)c[e++]=new pb;b=a.f;c=d=a.e}for(var e=rb,f=a.j,g=a.position,h=a.g,l=0,k=0,m="",p=0,r=!1,w=h[b],q=-9;;){var y=f.charCodeAt(g);switch(e[y]||e[65]){case 72:l=51;m=isNaN(y)?"E_CSS_UNEXPECTED_EOF":"E_CSS_UNEXPECTED_CHAR";g++;break;case 1:g++;r=!0;continue;case 2:k=
g++;e=wb;continue;case 3:l=1;k=g++;e=sb;continue;case 4:k=g++;l=31;e=yb;continue;case 33:l=2;k=++g;e=Kb;continue;case 34:l=2;k=++g;e=Mb;continue;case 6:k=++g;l=7;e=sb;continue;case 7:k=g++;l=32;e=yb;continue;case 8:k=g++;l=21;break;case 9:k=g++;l=32;e=Bb;continue;case 10:k=g++;l=10;break;case 11:k=g++;l=11;break;case 12:k=g++;l=36;e=yb;continue;case 13:k=g++;l=23;break;case 14:k=g++;l=16;break;case 15:l=24;k=g++;e=ub;continue;case 16:k=g++;e=tb;continue;case 78:k=g++;l=9;e=sb;continue;case 17:k=g++;
l=19;e=Cb;continue;case 18:k=g++;l=18;e=zb;continue;case 77:g++;l=50;break;case 19:k=g++;l=17;break;case 20:k=g++;l=38;e=Gb;continue;case 21:k=g++;l=39;e=yb;continue;case 22:k=g++;l=37;e=yb;continue;case 23:k=g++;l=22;break;case 24:k=++g;l=20;e=sb;continue;case 25:k=g++;l=14;break;case 26:k=g++;l=15;break;case 27:k=g++;l=12;break;case 28:k=g++;l=13;break;case 29:q=k=g++;l=1;e=Jb;continue;case 30:k=g++;l=33;e=yb;continue;case 31:k=g++;l=34;e=Ab;continue;case 32:k=g++;l=35;e=yb;continue;case 35:break;
case 36:g++;l=l+41-31;break;case 37:l=5;p=parseInt(f.substring(k,g),10);break;case 38:l=4;p=parseFloat(f.substring(k,g));break;case 39:g++;continue;case 40:l=3;p=parseFloat(f.substring(k,g));k=g++;e=sb;continue;case 41:l=3;p=parseFloat(f.substring(k,g));m="%";k=g++;break;case 42:g++;e=xb;continue;case 43:m=f.substring(k,g);break;case 44:q=g++;e=Jb;continue;case 45:m=ob(f.substring(k,g));break;case 46:m=f.substring(k,g);g++;break;case 47:m=ob(f.substring(k,g));g++;break;case 48:q=g;g+=2;e=Nb;continue;
case 49:q=g;g+=2;e=Ob;continue;case 50:g++;l=25;break;case 51:g++;l=26;break;case 52:m=f.substring(k,g);if(1==l){g++;if("url"==m.toLowerCase()){e=Pb;continue}l=6}break;case 53:m=ob(f.substring(k,g));if(1==l){g++;if("url"==m.toLowerCase()){e=Pb;continue}l=6}break;case 54:e=Db;g++;continue;case 55:e=Eb;g++;continue;case 56:e=rb;g++;continue;case 57:e=Fb;g++;continue;case 58:l=5;e=wb;g++;continue;case 59:l=4;e=xb;g++;continue;case 60:l=1;e=sb;g++;continue;case 61:l=1;e=Jb;q=g++;continue;case 62:g--;
break;case 63:g-=2;break;case 64:k=g++;e=Qb;continue;case 65:k=++g;e=Rb;continue;case 66:k=++g;e=Sb;continue;case 67:l=8;m=ob(f.substring(k,g));g++;break;case 69:g++;break;case 70:e=Hb;g++;continue;case 71:e=Ib;g++;continue;case 79:if(8>g-q&&f.substring(q+1,g+1).match(/^[0-9a-fA-F]{0,6}(\r\n|[\n\r])|[ \t]$/)){g++;continue}case 68:l=8;m=ob(f.substring(k,g));g++;e=Tb;continue;case 74:g++;if(9>g-q&&f.substring(q+1,g).match(/^[0-9a-fA-F]{0,6}(\r\n|[\n\r])$/))continue;l=51;m="E_CSS_UNEXPECTED_NEWLINE";
break;case 73:if(9>g-q&&f.substring(q+1,g+1).match(/^[0-9a-fA-F]{0,6}[ \t]$/)){g++;continue}m=ob(f.substring(k,g));break;case 75:q=g++;continue;case 76:g++;e=vb;continue;default:if(e!==rb){l=51;m="E_CSS_UNEXPECTED_STATE";break}k=g;l=0}w.type=l;w.b=r;w.C=p;w.text=m;w.position=k;b++;if(b>=c)break;e=rb;r=!1;w=h[b&d]}a.position=g;a.f=b&d};function Xb(){return{fontFamily:"serif",lineHeight:1.25,margin:8,Uc:!0,Qc:25,Tc:!1,ad:!1,$a:!1,Mb:1,vd:{print:!0}}}function Yb(a){return{fontFamily:a.fontFamily,lineHeight:a.lineHeight,margin:a.margin,Uc:a.Uc,Qc:a.Qc,Tc:a.Tc,ad:a.ad,$a:a.$a,Mb:a.Mb,vd:Object.Xb({},a.vd)}}var Zb=Xb(),$b={};function ac(a,b,c,d){a=Math.min((a-0)/c,(b-0)/d);return"matrix("+a+",0,0,"+a+",0,0)"}function bc(a){return'"'+Na(a+"")+'"'}function cc(a){return Ma(a+"")}function dc(a,b){return a?Ma(a)+"."+Ma(b):Ma(b)}var ec=0;
function gc(a,b){this.parent=a;this.j="S"+ec++;this.children=[];this.b=new hc(this,0);this.d=new hc(this,1);this.g=new hc(this,!0);this.f=new hc(this,!1);a&&a.children.push(this);this.values={};this.l={};this.k={};this.h=b;if(!a){var c=this.k;c.floor=Math.floor;c.ceil=Math.ceil;c.round=Math.round;c.sqrt=Math.sqrt;c.min=Math.min;c.max=Math.max;c.letterbox=ac;c["css-string"]=bc;c["css-name"]=cc;c["typeof"]=function(a){return typeof a};ic(this,"page-width",function(){return this.qb()});ic(this,"page-height",
function(){return this.pb()});ic(this,"pref-font-family",function(){return this.T.fontFamily});ic(this,"pref-night-mode",function(){return this.T.ad});ic(this,"pref-hyphenate",function(){return this.T.Uc});ic(this,"pref-margin",function(){return this.T.margin});ic(this,"pref-line-height",function(){return this.T.lineHeight});ic(this,"pref-column-width",function(){return this.T.Qc*this.fontSize});ic(this,"pref-horizontal",function(){return this.T.Tc});ic(this,"pref-spread-view",function(){return this.T.$a})}}
function ic(a,b,c){a.values[b]=new jc(a,c,b)}function kc(a,b){a.values["page-number"]=b}function lc(a,b){a.k["has-content"]=b}var mc={px:1,"in":96,pt:4/3,pc:16,cm:96/2.54,mm:96/25.4,q:96/2.54/40,em:16,rem:16,ex:8,rex:8,dppx:1,dpi:1/96,dpcm:2.54/96};function nc(a){switch(a){case "q":case "rem":case "rex":return!0;default:return!1}}
function oc(a,b,c,d){this.Aa=b;this.ib=c;this.F=null;this.qb=function(){return this.F?this.F:this.T.$a?Math.floor(b/2)-this.T.Mb:b};this.D=null;this.pb=function(){return this.D?this.D:c};this.j=d;this.O=null;this.fontSize=function(){return this.O?this.O:d};this.T=Zb;this.w={}}function pc(a,b){a.w[b.j]={};for(var c=0;c<b.children.length;c++)pc(a,b.children[c])}
function qc(a,b,c){return"vw"==b?a.qb()/100:"vh"==b?a.pb()/100:"em"==b||"rem"==b?c?a.j:a.fontSize():"ex"==b||"rex"==b?mc.ex*(c?a.j:a.fontSize())/mc.em:mc[b]}function rc(a,b,c){do{var d=b.values[c];if(d||b.h&&(d=b.h.call(a,c,!1)))return d;b=b.parent}while(b);throw Error("Name '"+c+"' is undefined");}
function sc(a,b,c,d,e){do{var f=b.l[c];if(f||b.h&&(f=b.h.call(a,c,!0)))return f;if(f=b.k[c]){if(e)return b.b;c=Array(d.length);for(e=0;e<d.length;e++)c[e]=d[e].evaluate(a);return new hc(b,f.apply(a,c))}b=b.parent}while(b);throw Error("Function '"+c+"' is undefined");}
function tc(a,b,c){var d="",e=b.match(/^(min|max)-(.*)$/);e&&(d=e[1],b=e[2]);var f=e=null;switch(b){case "width":case "height":case "device-width":case "device-height":case "color":c&&(e=c.evaluate(a))}switch(b){case "width":f=a.qb();break;case "height":f=a.pb();break;case "device-width":f=window.screen.availWidth;break;case "device-height":f=window.screen.availHeight;break;case "color":f=window.screen.pixelDepth}if(null!=f&&null!=e)switch(d){case "min":return f>=e;case "max":return f<=e;default:return f==
e}else if(null!=f&&null==c)return 0!==f;return!1}function uc(a){this.b=a;this.f="_"+ec++}n=uc.prototype;n.toString=function(){var a=new Ja;this.na(a,0);return a.toString()};n.na=function(){throw Error("F_ABSTRACT");};n.Ra=function(){throw Error("F_ABSTRACT");};n.Ga=function(){return this};n.Bb=function(a){return a===this};function vc(a,b,c,d){var e=d[a.f];if(null!=e)return e===$b?!1:e;d[a.f]=$b;b=a.Bb(b,c,d);return d[a.f]=b}
n.evaluate=function(a){var b;b=(b=a.w[this.b.j])?b[this.f]:void 0;if("undefined"!=typeof b)return b;b=this.Ra(a);var c=this.f,d=this.b,e=a.w[d.j];e||(e={},a.w[d.j]=e);return e[c]=b};n.yd=function(){return!1};function wc(a,b){uc.call(this,a);this.d=b}t(wc,uc);n=wc.prototype;n.sd=function(){throw Error("F_ABSTRACT");};n.wd=function(){throw Error("F_ABSTRACT");};n.Ra=function(a){a=this.d.evaluate(a);return this.wd(a)};n.Bb=function(a,b,c){return a===this||vc(this.d,a,b,c)};
n.na=function(a,b){10<b&&a.append("(");a.append(this.sd());this.d.na(a,10);10<b&&a.append(")")};n.Ga=function(a,b){var c=this.d.Ga(a,b);return c===this.d?this:new this.constructor(this.b,c)};function B(a,b,c){uc.call(this,a);this.d=b;this.e=c}t(B,uc);n=B.prototype;n.oc=function(){throw Error("F_ABSTRACT");};n.Da=function(){throw Error("F_ABSTRACT");};n.Ya=function(){throw Error("F_ABSTRACT");};n.Ra=function(a){var b=this.d.evaluate(a);a=this.e.evaluate(a);return this.Ya(b,a)};
n.Bb=function(a,b,c){return a===this||vc(this.d,a,b,c)||vc(this.e,a,b,c)};n.na=function(a,b){var c=this.oc();c<=b&&a.append("(");this.d.na(a,c);a.append(this.Da());this.e.na(a,c);c<=b&&a.append(")")};n.Ga=function(a,b){var c=this.d.Ga(a,b),d=this.e.Ga(a,b);return c===this.d&&d===this.e?this:new this.constructor(this.b,c,d)};function xc(a,b,c){B.call(this,a,b,c)}t(xc,B);xc.prototype.oc=function(){return 1};function yc(a,b,c){B.call(this,a,b,c)}t(yc,B);yc.prototype.oc=function(){return 2};
function zc(a,b,c){B.call(this,a,b,c)}t(zc,B);zc.prototype.oc=function(){return 3};function Ac(a,b,c){B.call(this,a,b,c)}t(Ac,B);Ac.prototype.oc=function(){return 4};function Bc(a,b){wc.call(this,a,b)}t(Bc,wc);Bc.prototype.sd=function(){return"!"};Bc.prototype.wd=function(a){return!a};function Cc(a,b){wc.call(this,a,b)}t(Cc,wc);Cc.prototype.sd=function(){return"-"};Cc.prototype.wd=function(a){return-a};function Dc(a,b,c){B.call(this,a,b,c)}t(Dc,xc);Dc.prototype.Da=function(){return"&&"};
Dc.prototype.Ra=function(a){return this.d.evaluate(a)&&this.e.evaluate(a)};function Ec(a,b,c){B.call(this,a,b,c)}t(Ec,Dc);Ec.prototype.Da=function(){return" and "};function Fc(a,b,c){B.call(this,a,b,c)}t(Fc,xc);Fc.prototype.Da=function(){return"||"};Fc.prototype.Ra=function(a){return this.d.evaluate(a)||this.e.evaluate(a)};function Gc(a,b,c){B.call(this,a,b,c)}t(Gc,Fc);Gc.prototype.Da=function(){return", "};function Hc(a,b,c){B.call(this,a,b,c)}t(Hc,yc);Hc.prototype.Da=function(){return"<"};
Hc.prototype.Ya=function(a,b){return a<b};function Ic(a,b,c){B.call(this,a,b,c)}t(Ic,yc);Ic.prototype.Da=function(){return"<="};Ic.prototype.Ya=function(a,b){return a<=b};function Jc(a,b,c){B.call(this,a,b,c)}t(Jc,yc);Jc.prototype.Da=function(){return">"};Jc.prototype.Ya=function(a,b){return a>b};function Kc(a,b,c){B.call(this,a,b,c)}t(Kc,yc);Kc.prototype.Da=function(){return">="};Kc.prototype.Ya=function(a,b){return a>=b};function Lc(a,b,c){B.call(this,a,b,c)}t(Lc,yc);Lc.prototype.Da=function(){return"=="};
Lc.prototype.Ya=function(a,b){return a==b};function Mc(a,b,c){B.call(this,a,b,c)}t(Mc,yc);Mc.prototype.Da=function(){return"!="};Mc.prototype.Ya=function(a,b){return a!=b};function Nc(a,b,c){B.call(this,a,b,c)}t(Nc,zc);Nc.prototype.Da=function(){return"+"};Nc.prototype.Ya=function(a,b){return a+b};function Oc(a,b,c){B.call(this,a,b,c)}t(Oc,zc);Oc.prototype.Da=function(){return" - "};Oc.prototype.Ya=function(a,b){return a-b};function Pc(a,b,c){B.call(this,a,b,c)}t(Pc,Ac);Pc.prototype.Da=function(){return"*"};
Pc.prototype.Ya=function(a,b){return a*b};function Qc(a,b,c){B.call(this,a,b,c)}t(Qc,Ac);Qc.prototype.Da=function(){return"/"};Qc.prototype.Ya=function(a,b){return a/b};function Rc(a,b,c){B.call(this,a,b,c)}t(Rc,Ac);Rc.prototype.Da=function(){return"%"};Rc.prototype.Ya=function(a,b){return a%b};function Sc(a,b,c){uc.call(this,a);this.C=b;this.X=c.toLowerCase()}t(Sc,uc);Sc.prototype.na=function(a){a.append(this.C.toString());a.append(Ma(this.X))};
Sc.prototype.Ra=function(a){return this.C*qc(a,this.X,!1)};function Tc(a,b){uc.call(this,a);this.d=b}t(Tc,uc);Tc.prototype.na=function(a){a.append(this.d)};Tc.prototype.Ra=function(a){return rc(a,this.b,this.d).evaluate(a)};Tc.prototype.Bb=function(a,b,c){return a===this||vc(rc(b,this.b,this.d),a,b,c)};function Uc(a,b,c){uc.call(this,a);this.d=b;this.name=c}t(Uc,uc);Uc.prototype.na=function(a){this.d&&a.append("not ");a.append(Ma(this.name))};
Uc.prototype.Ra=function(a){var b=this.name;a="all"===b||!!a.T.vd[b];return this.d?!a:a};Uc.prototype.Bb=function(a,b,c){return a===this||vc(this.value,a,b,c)};Uc.prototype.yd=function(){return!0};function jc(a,b,c){uc.call(this,a);this.Kb=b;this.d=c}t(jc,uc);jc.prototype.na=function(a){a.append(this.d)};jc.prototype.Ra=function(a){return this.Kb.call(a)};function Vc(a,b,c){uc.call(this,a);this.e=b;this.d=c}t(Vc,uc);
Vc.prototype.na=function(a){a.append(this.e);var b=this.d;a.append("(");for(var c=0;c<b.length;c++)c&&a.append(","),b[c].na(a,0);a.append(")")};Vc.prototype.Ra=function(a){return sc(a,this.b,this.e,this.d,!1).Ga(a,this.d).evaluate(a)};Vc.prototype.Bb=function(a,b,c){if(a===this)return!0;for(var d=0;d<this.d.length;d++)if(vc(this.d[d],a,b,c))return!0;return vc(sc(b,this.b,this.e,this.d,!0),a,b,c)};
Vc.prototype.Ga=function(a,b){for(var c,d=c=this.d,e=0;e<c.length;e++){var f=c[e].Ga(a,b);if(c!==d)d[e]=f;else if(f!==c[e]){for(var d=Array(c.length),g=0;g<e;g++)d[g]=c[g];d[e]=f}}c=d;return c===this.d?this:new Vc(this.b,this.e,c)};function Wc(a,b,c,d){uc.call(this,a);this.d=b;this.g=c;this.e=d}t(Wc,uc);Wc.prototype.na=function(a,b){0<b&&a.append("(");this.d.na(a,0);a.append("?");this.g.na(a,0);a.append(":");this.e.na(a,0);0<b&&a.append(")")};
Wc.prototype.Ra=function(a){return this.d.evaluate(a)?this.g.evaluate(a):this.e.evaluate(a)};Wc.prototype.Bb=function(a,b,c){return a===this||vc(this.d,a,b,c)||vc(this.g,a,b,c)||vc(this.e,a,b,c)};Wc.prototype.Ga=function(a,b){var c=this.d.Ga(a,b),d=this.g.Ga(a,b),e=this.e.Ga(a,b);return c===this.d&&d===this.g&&e===this.e?this:new Wc(this.b,c,d,e)};function hc(a,b){uc.call(this,a);this.d=b}t(hc,uc);
hc.prototype.na=function(a){switch(typeof this.d){case "number":case "boolean":a.append(this.d.toString());break;case "string":a.append('"');a.append(Na(this.d));a.append('"');break;default:throw Error("F_UNEXPECTED_STATE");}};hc.prototype.Ra=function(){return this.d};function Xc(a,b,c){uc.call(this,a);this.name=b;this.value=c}t(Xc,uc);Xc.prototype.na=function(a){a.append("(");a.append(Na(this.name.name));a.append(":");this.value.na(a,0);a.append(")")};
Xc.prototype.Ra=function(a){return tc(a,this.name.name,this.value)};Xc.prototype.Bb=function(a,b,c){return a===this||vc(this.value,a,b,c)};Xc.prototype.Ga=function(a,b){var c=this.value.Ga(a,b);return c===this.value?this:new Xc(this.b,this.name,c)};function Yc(a,b){uc.call(this,a);this.index=b}t(Yc,uc);Yc.prototype.na=function(a){a.append("$");a.append(this.index.toString())};Yc.prototype.Ga=function(a,b){var c=b[this.index];if(!c)throw Error("Parameter missing: "+this.index);return c};
function Zc(a,b,c){return b===a.f||b===a.b||c==a.f||c==a.b?a.f:b===a.g||b===a.d?c:c===a.g||c===a.d?b:new Dc(a,b,c)}function C(a,b,c){return b===a.b?c:c===a.b?b:new Nc(a,b,c)}function D(a,b,c){return b===a.b?new Cc(a,c):c===a.b?b:new Oc(a,b,c)}function $c(a,b,c){return b===a.b||c===a.b?a.b:b===a.d?c:c===a.d?b:new Pc(a,b,c)}function ad(a,b,c){return b===a.b?a.b:c===a.d?b:new Qc(a,b,c)};var bd={};function cd(){}n=cd.prototype;n.vb=function(a){for(var b=0;b<a.length;b++)a[b].U(this)};n.nd=function(){throw Error("E_CSS_EMPTY_NOT_ALLOWED");};n.od=function(){throw Error("E_CSS_SLASH_NOT_ALLOWED");};n.lc=function(){throw Error("E_CSS_STR_NOT_ALLOWED");};n.ub=function(){throw Error("E_CSS_IDENT_NOT_ALLOWED");};n.Ub=function(){throw Error("E_CSS_NUMERIC_NOT_ALLOWED");};n.Tb=function(){throw Error("E_CSS_NUM_NOT_ALLOWED");};n.Sb=function(a){return this.Tb(a)};
n.Ic=function(){throw Error("E_CSS_COLOR_NOT_ALLOWED");};n.mc=function(){throw Error("E_CSS_URL_NOT_ALLOWED");};n.hb=function(){throw Error("E_CSS_LIST_NOT_ALLOWED");};n.tb=function(){throw Error("E_CSS_COMMA_NOT_ALLOWED");};n.kb=function(){throw Error("E_CSS_FUNC_NOT_ALLOWED");};n.Rb=function(){throw Error("E_CSS_EXPR_NOT_ALLOWED");};function dd(){}t(dd,cd);n=dd.prototype;
n.vb=function(a){for(var b=null,c=0;c<a.length;c++){var d=a[c],e=d.U(this);if(b)b[c]=e;else if(d!==e){b=Array(a.length);for(d=0;d<c;d++)b[d]=a[d];b[c]=e}}return b||a};n.lc=function(a){return a};n.ub=function(a){return a};n.od=function(a){return a};n.Ub=function(a){return a};n.Tb=function(a){return a};n.Sb=function(a){return a};n.Ic=function(a){return a};n.mc=function(a){return a};n.hb=function(a){var b=this.vb(a.values);return b===a.values?a:new ed(b)};
n.tb=function(a){var b=this.vb(a.values);return b===a.values?a:new fd(b)};n.kb=function(a){var b=this.vb(a.values);return b===a.values?a:new gd(a.name,b)};n.Rb=function(a){return a};function hd(){}n=hd.prototype;n.toString=function(){var a=new Ja;this.Ba(a,!0);return a.toString()};n.stringValue=function(){var a=new Ja;this.Ba(a,!1);return a.toString()};n.ka=function(){throw Error("F_ABSTRACT");};n.Ba=function(a){a.append("[error]")};n.xd=function(){return!1};n.$b=function(){return!1};n.zd=function(){return!1};
n.Od=function(){return!1};n.Zc=function(){return!1};function id(){if(F)throw Error("E_INVALID_CALL");}t(id,hd);id.prototype.ka=function(a){return new hc(a,"")};id.prototype.Ba=function(){};id.prototype.U=function(a){return a.nd(this)};var F=new id;function jd(){if(kd)throw Error("E_INVALID_CALL");}t(jd,hd);jd.prototype.ka=function(a){return new hc(a,"/")};jd.prototype.Ba=function(a){a.append("/")};jd.prototype.U=function(a){return a.od(this)};var kd=new jd;function ld(a){this.b=a}t(ld,hd);
ld.prototype.ka=function(a){return new hc(a,this.b)};ld.prototype.Ba=function(a,b){b?(a.append('"'),a.append(Na(this.b)),a.append('"')):a.append(this.b)};ld.prototype.U=function(a){return a.lc(this)};function md(a){this.name=a;if(bd[a])throw Error("E_INVALID_CALL");bd[a]=this}t(md,hd);md.prototype.ka=function(a){return new hc(a,this.name)};md.prototype.Ba=function(a,b){b?a.append(Ma(this.name)):a.append(this.name)};md.prototype.U=function(a){return a.ub(this)};md.prototype.Od=function(){return!0};
function G(a){var b=bd[a];b||(b=new md(a));return b}function H(a,b){this.C=a;this.X=b.toLowerCase()}t(H,hd);H.prototype.ka=function(a,b){return 0==this.C?a.b:b&&"%"==this.X?100==this.C?b:new Pc(a,b,new hc(a,this.C/100)):new Sc(a,this.C,this.X)};H.prototype.Ba=function(a){a.append(this.C.toString());a.append(this.X)};H.prototype.U=function(a){return a.Ub(this)};H.prototype.$b=function(){return!0};function nd(a){this.C=a}t(nd,hd);
nd.prototype.ka=function(a){return 0==this.C?a.b:1==this.C?a.d:new hc(a,this.C)};nd.prototype.Ba=function(a){a.append(this.C.toString())};nd.prototype.U=function(a){return a.Tb(this)};nd.prototype.zd=function(){return!0};function od(a){this.C=a}t(od,nd);od.prototype.U=function(a){return a.Sb(this)};function pd(a){this.b=a}t(pd,hd);pd.prototype.Ba=function(a){a.append("#");var b=this.b.toString(16);a.append("000000".substr(b.length));a.append(b)};pd.prototype.U=function(a){return a.Ic(this)};
function qd(a){this.url=a}t(qd,hd);qd.prototype.Ba=function(a){a.append('url("');a.append(Na(this.url));a.append('")')};qd.prototype.U=function(a){return a.mc(this)};function rd(a,b,c,d){var e=b.length;b[0].Ba(a,d);for(var f=1;f<e;f++)a.append(c),b[f].Ba(a,d)}function ed(a){this.values=a}t(ed,hd);ed.prototype.Ba=function(a,b){rd(a,this.values," ",b)};ed.prototype.U=function(a){return a.hb(this)};ed.prototype.Zc=function(){return!0};function fd(a){this.values=a}t(fd,hd);
fd.prototype.Ba=function(a,b){rd(a,this.values,",",b)};fd.prototype.U=function(a){return a.tb(this)};function gd(a,b){this.name=a;this.values=b}t(gd,hd);gd.prototype.Ba=function(a,b){a.append(Ma(this.name));a.append("(");rd(a,this.values,",",b);a.append(")")};gd.prototype.U=function(a){return a.kb(this)};function I(a){this.d=a}t(I,hd);I.prototype.ka=function(){return this.d};I.prototype.Ba=function(a){a.append("-epubx-expr(");this.d.na(a,0);a.append(")")};I.prototype.U=function(a){return a.Rb(this)};
I.prototype.xd=function(){return!0};function sd(a,b){if(a){if(a.$b())return qc(b,a.X,!1)*a.C;if(a.zd())return a.C}return 0}var td=G("absolute"),ud=G("all"),vd=G("always"),wd=G("auto");G("avoid");var xd=G("block"),yd=G("block-end"),zd=G("block-start"),Ad=G("both"),Bd=G("bottom"),Cd=G("border-box"),Dd=G("crop"),Ed=G("cross"),Fd=G("exclusive"),Gd=G("false"),Hd=G("fixed"),Id=G("flex"),Jd=G("footnote");G("hidden");
var Kd=G("horizontal-tb"),Ld=G("inherit"),Md=G("inline"),Nd=G("inline-block"),Od=G("inline-end"),Pd=G("inline-start"),Qd=G("landscape"),Rd=G("left"),Sd=G("list-item"),Td=G("ltr"),J=G("none"),Ud=G("normal"),Vd=G("oeb-page-foot"),Wd=G("oeb-page-head"),Xd=G("page"),Yd=G("relative"),Zd=G("right"),$d=G("scale"),ae=G("static"),be=G("rtl");G("table");
var ce=G("table-caption"),de=G("table-cell"),ee=G("table-row"),fe=G("top"),ge=G("transparent"),he=G("vertical-lr"),ie=G("vertical-rl"),je=G("visible"),ke=G("true"),le=new H(100,"%"),me=new H(100,"vw"),ne=new H(100,"vh"),oe=new H(0,"px"),pe={"font-size":1,color:2};function qe(a,b){return(pe[a]||Number.MAX_VALUE)-(pe[b]||Number.MAX_VALUE)};function re(a,b,c,d){this.ca=a;this.W=b;this.V=c;this.S=d}function se(a,b){this.x=a;this.y=b}function te(){this.bottom=this.right=this.top=this.left=0}function ue(a,b,c,d){this.b=a;this.d=b;this.f=c;this.e=d}function ve(a,b,c,d){this.W=a;this.S=b;this.ca=c;this.V=d;this.right=this.left=null}function we(a,b){return a.b.y-b.b.y||a.b.x-b.b.x}function xe(a){this.b=a}function ye(a,b,c){a=a.b;for(var d=a.length,e=a[d-1],f=0;f<d;f++){var g=a[f];b.push(e.y<g.y?new ue(e,g,1,c):new ue(g,e,-1,c));e=g}}
function ze(a,b,c,d){for(var e=[],f=0;20>f;f++){var g=2*f*Math.PI/20;e.push(new se(a+c*Math.sin(g),b+d*Math.cos(g)))}return new xe(e)}function Ae(a,b,c,d){return new xe([new se(a,b),new se(c,b),new se(c,d),new se(a,d)])}function Be(a,b,c,d){this.x=a;this.e=b;this.b=c;this.d=d}function Ce(a,b){var c=a.b.x+(a.d.x-a.b.x)*(b-a.b.y)/(a.d.y-a.b.y);if(isNaN(c))throw Error("Bad intersection");return c}
function De(a,b,c,d){var e,f;b.d.y<c&&u.b("Error: inconsistent segment (1)");b.b.y<=c?(c=Ce(b,c),e=b.f):(c=b.b.x,e=0);b.d.y>=d?(d=Ce(b,d),f=b.f):(d=b.d.x,f=0);c<d?(a.push(new Be(c,e,b.e,-1)),a.push(new Be(d,f,b.e,1))):(a.push(new Be(d,f,b.e,-1)),a.push(new Be(c,e,b.e,1)))}
function Ee(a,b,c){c=b+c;for(var d=Array(c),e=Array(c),f=0;f<=c;f++)d[f]=0,e[f]=0;for(var g=[],h=!1,l=a.length,k=0;k<l;k++){var m=a[k];d[m.b]+=m.e;e[m.b]+=m.d;for(var p=!1,f=0;f<b;f++)if(d[f]&&!e[f]){p=!0;break}if(p)for(f=b;f<=c;f++)if(d[f]||e[f]){p=!1;break}h!=p&&(g.push(m.x),h=p)}return g}function Fe(a,b){return b?Math.ceil(a/b)*b:a}function Ge(a,b){return b?Math.floor(a/b)*b:a}function He(a){return new se(a.y,-a.x)}function Ie(a){return new re(a.W,-a.V,a.S,-a.ca)}
function Je(a){return new xe(Xa(a.b,He))}
function Ke(a,b,c,d,e){e&&(a=Ie(a),b=Xa(b,Je),c=Xa(c,Je));e=b.length;var f=c?c.length:0,g=[],h=[],l,k,m;for(l=0;l<e;l++)ye(b[l],h,l);for(l=0;l<f;l++)ye(c[l],h,l+e);b=h.length;h.sort(we);for(c=0;h[c].e>=e;)c++;c=h[c].b.y;c>a.W&&g.push(new ve(a.W,c,a.V,a.V));l=0;for(var p=[];l<b&&(m=h[l]).b.y<c;)m.d.y>c&&p.push(m),l++;for(;l<b||0<p.length;){var r=a.S,w=Fe(Math.ceil(c+8),d);for(k=0;k<p.length&&r>w;k++)m=p[k],m.b.x==m.d.x?m.d.y<r&&(r=Math.max(Ge(m.d.y,d),w)):m.b.x!=m.d.x&&(r=w);r>a.S&&(r=a.S);for(;l<
b&&(m=h[l]).b.y<r;)if(m.d.y<c)l++;else if(m.b.y<w){if(m.b.y!=m.d.y||m.b.y!=c)p.push(m),r=w;l++}else{k=Ge(m.b.y,d);k<r&&(r=k);break}w=[];for(k=0;k<p.length;k++)De(w,p[k],c,r);w.sort(function(a,b){return a.x-b.x||a.d-b.d});w=Ee(w,e,f);if(0==w.length)g.push(new ve(c,r,a.V,a.V));else{var q=0,y=a.ca;for(k=0;k<w.length;k+=2){var S=Math.max(a.ca,w[k]),X=Math.min(a.V,w[k+1])-S;X>q&&(q=X,y=S)}0==q?g.push(new ve(c,r,a.V,a.V)):g.push(new ve(c,r,Math.max(y,a.ca),Math.min(y+q,a.V)))}if(r==a.S)break;c=r;for(k=
p.length-1;0<=k;k--)p[k].d.y<=r&&p.splice(k,1)}Le(a,g);return g}function Le(a,b){for(var c=b.length-1,d=new ve(a.S,a.S,a.ca,a.V);0<=c;){var e=d,d=b[c];d.ca==e.ca&&d.V==e.V&&(e.W=d.W,b.splice(c,1),d=e);c--}}function Me(a,b){for(var c=0,d=a.length;c<d;){var e=Math.floor((c+d)/2);b>=a[e].S?c=e+1:d=e}return c}
function Ne(a,b,c,d){for(var e=c.W,f=c.V-c.ca,g=c.S-c.W,h=Me(b,e);;){var l=e+g;if(l>a.S)break;for(var k=a.ca,m=a.V,p=h;p<b.length&&b[p].W<l;p++){var r=b[p];r.ca>k&&(k=r.ca);r.V<m&&(m=r.V)}if(k+f<=m||h>=b.length){"left"==d?(c.ca=k,c.V=k+f):(c.ca=m-f,c.V=m);c.S+=e-c.W;c.W=e;break}e=b[h].S;h++}}
function Oe(a,b,c,d){for(var e=null,e=[new ve(c.W,c.S,c.ca,c.V)];0<e.length&&e[0].S<=a.W;)e.shift();if(0!=e.length){e[0].W<a.W&&(e[0].W=a.W);c=0==b.length?a.W:b[b.length-1].S;c<a.S&&b.push(new ve(c,a.S,a.ca,a.V));for(var f=Me(b,e[0].W),g=0;g<e.length;g++){var h=e[g];if(f==b.length)break;b[f].W<h.W&&(c=b[f],f++,b.splice(f,0,new ve(h.W,c.S,c.ca,c.V)),c.S=h.W);for(;f<b.length&&(c=b[f++],c.S>h.S&&(b.splice(f,0,new ve(h.S,c.S,c.ca,c.V)),c.S=h.S),h.ca!=h.V&&("left"==d?c.ca=Math.min(h.V,a.V):c.V=Math.max(h.ca,
a.ca)),c.S!=h.S););}Le(a,b)}};function Pe(a){return String.fromCharCode(a>>>24&255,a>>>16&255,a>>>8&255,a&255)}
function Qe(a){var b=new Ja;b.append(a);var c=55-a.length&63;for(b.append("\u0080");0<c;)c--,b.append("\x00");b.append("\x00\x00\x00\x00");b.append(Pe(8*a.length));a=b.toString();for(var b=[1732584193,4023233417,2562383102,271733878,3285377520],c=[],d,e=0;e<a.length;e+=64){for(d=0;16>d;d++){var f=a.substr(e+4*d,4);c[d]=(f.charCodeAt(0)&255)<<24|(f.charCodeAt(1)&255)<<16|(f.charCodeAt(2)&255)<<8|f.charCodeAt(3)&255}for(;80>d;d++)f=c[d-3]^c[d-8]^c[d-14]^c[d-16],c[d]=f<<1|f>>>31;var f=b[0],g=b[1],h=
b[2],l=b[3],k=b[4],m;for(d=0;80>d;d++)m=20>d?(g&h|~g&l)+1518500249:40>d?(g^h^l)+1859775393:60>d?(g&h|g&l|h&l)+2400959708:(g^h^l)+3395469782,m+=(f<<5|f>>>27)+k+c[d],k=l,l=h,h=g<<30|g>>>2,g=f,f=m;b[0]=b[0]+f|0;b[1]=b[1]+g|0;b[2]=b[2]+h|0;b[3]=b[3]+l|0;b[4]=b[4]+k|0}return b}function Re(a){a=Qe(a);for(var b=[],c=0;c<a.length;c++){var d=a[c];b.push(d>>>24&255,d>>>16&255,d>>>8&255,d&255)}return b}
function Se(a){a=Qe(a);for(var b=new Ja,c=0;c<a.length;c++)b.append(Pe(a[c]));a=b.toString();b=new Ja;for(c=0;c<a.length;c++)b.append((a.charCodeAt(c)|256).toString(16).substr(1));return b.toString()};var Te=null,Ue=null;function L(a){if(!Te)throw Error("E_TASK_NO_CONTEXT");Te.name||(Te.name=a);var b=Te;a=new Ve(b,b.top,a);b.top=a;a.b=We;return a}function M(a){return new Xe(a)}function Ye(a,b,c){a=L(a);a.g=c;try{b(a)}catch(d){Ze(a.d,d,a)}return N(a)}function $e(a){var b=af,c;Te?c=Te.d:(c=Ue)||(c=new bf(new cf));b(c,a,void 0)}var We=1;function cf(){}cf.prototype.currentTime=function(){return(new Date).valueOf()};function df(a,b){return setTimeout(a,b)}
function bf(a){this.e=a;this.f=1;this.slice=25;this.h=0;this.d=new Ca;this.b=this.j=null;this.g=!1;this.Q=0;Ue||(Ue=this)}
function ef(a){if(!a.g){var b=a.d.b[1].b,c=a.e.currentTime();if(null!=a.b){if(c+a.f>a.j)return;clearTimeout(a.b)}b-=c;b<=a.f&&(b=a.f);a.j=c+b;a.b=df(function(){a.b=null;null!=a.b&&(clearTimeout(a.b),a.b=null);a.g=!0;try{var b=a.e.currentTime();for(a.h=b+a.slice;a.d.length();){var c=a.d.b[1];if(c.b>b)break;var f=a.d,g=f.b.pop(),h=f.b.length;if(1<h){for(var l=1;;){var k=2*l;if(k>=h)break;if(0<ff(f.b[k],g))k+1<h&&0<ff(f.b[k+1],f.b[k])&&k++;else if(k+1<h&&0<ff(f.b[k+1],g))k++;else break;f.b[l]=f.b[k];
l=k}f.b[l]=g}if(!c.f){var l=c,m=l.d;l.d=null;m&&m.b==l&&(m.b=null,k=Te,Te=m,O(m.top,l.e),Te=k)}b=a.e.currentTime();if(b>=a.h)break}}catch(p){u.error(p)}a.g=!1;a.d.length()&&ef(a)},b)}}bf.prototype.Ta=function(a,b){var c=this.e.currentTime();a.Q=this.Q++;a.b=c+(b||0);a:{for(var c=this.d,d=c.b.length;1<d;){var e=Math.floor(d/2),f=c.b[e];if(0<ff(f,a)){c.b[d]=a;break a}c.b[d]=f;d=e}c.b[1]=a}ef(this)};
function af(a,b,c){var d=new gf(a,c||"");d.top=new Ve(d,null,"bootstrap");d.top.b=We;d.top.then(function(){function a(){d.h=!1;for(var b=0;b<d.g.length;b++){var c=d.g[b];try{c()}catch(e){u.error(e)}}}try{b().then(function(b){d.f=b;a()})}catch(c){Ze(d,c),a()}});c=Te;Te=d;a.Ta(hf(d.top,"bootstrap"));Te=c;return d}function jf(a){this.d=a;this.Q=this.b=0;this.e=null;this.f=!1}function ff(a,b){return b.b-a.b||b.Q-a.Q}jf.prototype.Ta=function(a,b){this.e=a;this.d.d.Ta(this,b)};
function gf(a,b){this.d=a;this.name=b;this.g=[];this.e=null;this.h=!0;this.b=this.top=this.j=this.f=null}function kf(a,b){a.g.push(b)}gf.prototype.join=function(){var a=L("Task.join");if(this.h){var b=hf(a,this),c=this;kf(this,function(){b.Ta(c.f)})}else O(a,this.f);return N(a)};
function Ze(a,b,c){var d=b.frameTrace;if(!d){for(var d=b.stack?b.stack+"\n\t---- async ---\n":"",e=a.top;e;e=e.parent)d+="\t",d+=e.name,d+="\n";b.frameTrace=d}if(c){for(d=a.top;d&&d!=c;)d=d.parent;d==c&&(a.top=d)}for(a.e=b;a.top&&!a.top.g;)a.top=a.top.parent;a.top?(b=a.e,a.e=null,a.top.g(a.top,b)):a.e&&u.error(a.e,"Unhandled exception in task",a.name)}function Xe(a){this.value=a}n=Xe.prototype;n.then=function(a){a(this.value)};n.Qb=function(a){return a(this.value)};n.kd=function(a){return new Xe(a)};
n.ua=function(a){O(a,this.value)};n.Ca=function(){return!1};n.get=function(){return this.value};function lf(a){this.b=a}n=lf.prototype;n.then=function(a){this.b.then(a)};n.Qb=function(a){if(this.Ca()){var b=new Ve(this.b.d,this.b.parent,"AsyncResult.thenAsync");b.b=We;this.b.parent=b;this.b.then(function(c){a(c).then(function(a){O(b,a)})});return N(b)}return a(this.b.e)};n.kd=function(a){return this.Ca()?this.Qb(function(){return new Xe(a)}):new Xe(a)};
n.ua=function(a){this.Ca()?this.then(function(b){O(a,b)}):O(a,this.b.e)};n.Ca=function(){return this.b.b==We};n.get=function(){if(this.Ca())throw Error("Result is pending");return this.b.e};function Ve(a,b,c){this.d=a;this.parent=b;this.name=c;this.e=null;this.b=0;this.g=this.f=null}function mf(a){if(!Te)throw Error("F_TASK_NO_CONTEXT");if(a!==Te.top)throw Error("F_TASK_NOT_TOP_FRAME");}function N(a){return new lf(a)}
function O(a,b){mf(a);Te.e||(a.e=b);a.b=2;var c=a.parent;Te.top=c;if(a.f){try{a.f(b)}catch(d){Ze(a.d,d,c)}a.b=3}}Ve.prototype.then=function(a){switch(this.b){case We:if(this.f)throw Error("F_TASK_FRAME_ALREADY_HAS_CALLBACK");this.f=a;break;case 2:var b=this.d,c=this.parent;try{a(this.e),this.b=3}catch(d){this.b=3,Ze(b,d,c)}break;case 3:throw Error("F_TASK_DEAD_FRAME");default:throw Error("F_TASK_UNEXPECTED_FRAME_STATE "+this.b);}};
function nf(){var a=L("Frame.timeSlice"),b=a.d.d;b.e.currentTime()>=b.h?(u.debug("-- time slice --"),hf(a).Ta(!0)):O(a,!0);return N(a)}function of(a){var b=L("Frame.sleep");hf(b).Ta(!0,a);return N(b)}function pf(a){function b(d){try{for(;d;){var e=a();if(e.Ca()){e.then(b);return}e.then(function(a){d=a})}O(c,!0)}catch(f){Ze(c.d,f,c)}}var c=L("Frame.loop");b(!0);return N(c)}
function qf(a){var b=Te;if(!b)throw Error("E_TASK_NO_CONTEXT");return pf(function(){var c;do c=new rf(b,b.top),b.top=c,c.b=We,a(c),c=N(c);while(!c.Ca()&&c.get());return c})}function hf(a,b){mf(a);if(a.d.b)throw Error("E_TASK_ALREADY_SUSPENDED");var c=new jf(a.d);a.d.b=c;Te=null;a.d.j=b||null;return c}function rf(a,b){Ve.call(this,a,b,"loop")}t(rf,Ve);function sf(a){O(a,!0)}function P(a){O(a,!1)};function tf(a,b,c,d,e){var f=L("ajax"),g=new XMLHttpRequest,h=hf(f,g),l={status:0,url:a,contentType:null,responseText:null,responseXML:null,yc:null};g.open(c||"GET",a,!0);b&&(g.responseType=b);g.onreadystatechange=function(){if(4===g.readyState){l.status=g.status;if(200==l.status||0==l.status)if(b&&"document"!==b||!g.responseXML){var c=g.response;b&&"text"!==b||"string"!=typeof c?c?"string"==typeof c?l.yc=uf([c]):l.yc=c:u.b("Unexpected empty success response for",a):l.responseText=c;if(c=g.getResponseHeader("Content-Type"))l.contentType=
c.replace(/(.*);.*$/,"$1")}else l.responseXML=g.responseXML,l.contentType=g.responseXML.contentType;h.Ta(l)}};try{d?(g.setRequestHeader("Content-Type",e||"text/plain; charset=UTF-8"),g.send(d)):g.send(null)}catch(k){u.b(k,"Error fetching "+a),h.Ta(l)}return N(f)}function uf(a){var b=window.WebKitBlobBuilder||window.MSBlobBuilder;if(b){for(var b=new b,c=0;c<a.length;c++)b.append(a[c]);return b.getBlob("application/octet-stream")}return new Blob(a,{type:"application/octet-stream"})}
function vf(a){var b=L("readBlob"),c=new FileReader,d=hf(b,c);c.addEventListener("load",function(){d.Ta(c.result)},!1);c.readAsArrayBuffer(a);return N(b)}function wf(a,b){this.O=a;this.type=b;this.f={};this.g={}}wf.prototype.load=function(a,b,c){a=ua(a);var d=this.f[a];return"undefined"!=typeof d?M(d):this.sc(a,b,c).get()};
function xf(a,b,c,d){var e=L("fetch");tf(b,a.type).then(function(f){if(c&&400<=f.status)throw Error(d||"Failed to fetch required resource: "+b);a.O(f,a).then(function(c){delete a.g[b];a.f[b]=c;O(e,c)})});return N(e)}wf.prototype.sc=function(a,b,c){a=ua(a);if(this.f[a])return null;var d=this.g[a];if(!d){var e=this,d=new yf(function(){return xf(e,a,b,c)},"Fetch "+a);e.g[a]=d;d.start()}return d};wf.prototype.get=function(a){return this.f[ua(a)]};
function zf(a){a=a.responseText;return M(a?JSON.parse(a):null)};function Af(a){var b=parseInt(a,16);if(isNaN(b))throw Error("E_CSS_COLOR");if(6==a.length)return new pd(b);if(3==a.length)return new pd(b&15|(b&15)<<4|(b&240)<<4|(b&240)<<8|(b&3840)<<8|(b&3840)<<12);throw Error("E_CSS_COLOR");}function Bf(a){this.d=a;this.La="Author"}n=Bf.prototype;n.Yb=function(){return null};n.Z=function(){return this.d};n.error=function(){};n.Pb=function(a){this.La=a};n.jb=function(){};n.Pc=function(){};n.cc=function(){};n.dc=function(){};n.Vc=function(){};n.qc=function(){};
n.mb=function(){};n.Oc=function(){};n.Nc=function(){};n.Sc=function(){};n.Lb=function(){};n.gb=function(){};n.Cc=function(){};n.gc=function(){};n.Gc=function(){};n.Ac=function(){};n.Fc=function(){};n.Ob=function(){};n.jd=function(){};n.Eb=function(){};n.Bc=function(){};n.Ec=function(){};n.Dc=function(){};n.jc=function(){};n.ic=function(){};n.pa=function(){};n.eb=function(){};n.nb=function(){};n.hc=function(){};n.rc=function(){};
function Cf(a){switch(a.La){case "UA":return 0;case "User":return 100663296;default:return 83886080}}function Df(a){switch(a.La){case "UA":return 0;case "User":return 16777216;default:return 33554432}}function Ef(){Bf.call(this,null);this.e=[];this.b=null}t(Ef,Bf);function Ff(a,b){a.e.push(a.b);a.b=b}n=Ef.prototype;n.Yb=function(){return null};n.Z=function(){return this.b.Z()};n.error=function(a,b){this.b.error(a,b)};
n.Pb=function(a){Bf.prototype.Pb.call(this,a);0<this.e.length&&(this.b=this.e[0],this.e=[]);this.b.Pb(a)};n.jb=function(a,b){this.b.jb(a,b)};n.Pc=function(a){this.b.Pc(a)};n.cc=function(a,b){this.b.cc(a,b)};n.dc=function(a,b){this.b.dc(a,b)};n.Vc=function(a){this.b.Vc(a)};n.qc=function(a,b,c,d){this.b.qc(a,b,c,d)};n.mb=function(){this.b.mb()};n.Oc=function(){this.b.Oc()};n.Nc=function(){this.b.Nc()};n.Sc=function(){this.b.Sc()};n.Lb=function(){this.b.Lb()};n.gb=function(){this.b.gb()};n.Cc=function(){this.b.Cc()};
n.gc=function(a){this.b.gc(a)};n.Gc=function(){this.b.Gc()};n.Ac=function(){this.b.Ac()};n.Fc=function(){this.b.Fc()};n.Ob=function(){this.b.Ob()};n.jd=function(a){this.b.jd(a)};n.Eb=function(a){this.b.Eb(a)};n.Bc=function(a){this.b.Bc(a)};n.Ec=function(){this.b.Ec()};n.Dc=function(a,b,c){this.b.Dc(a,b,c)};n.jc=function(a,b,c){this.b.jc(a,b,c)};n.ic=function(a,b,c){this.b.ic(a,b,c)};n.pa=function(){this.b.pa()};n.eb=function(a,b,c){this.b.eb(a,b,c)};n.nb=function(){this.b.nb()};n.hc=function(a){this.b.hc(a)};
n.rc=function(){this.b.rc()};function Gf(a,b,c){Bf.call(this,a);this.F=c;this.D=0;if(this.ba=b)this.La=b.La}t(Gf,Bf);Gf.prototype.Yb=function(){return this.ba.Yb()};Gf.prototype.error=function(a){u.b(a)};Gf.prototype.pa=function(){this.D++};Gf.prototype.nb=function(){if(0==--this.D&&!this.F){var a=this.ba;a.b=a.e.pop()}};function Hf(a,b,c){Gf.call(this,a,b,c)}t(Hf,Gf);function If(a,b){a.error(b,a.Yb())}function Jf(a,b){If(a,b);Ff(a.ba,new Gf(a.d,a.ba,!1))}n=Hf.prototype;n.gb=function(){Jf(this,"E_CSS_UNEXPECTED_SELECTOR")};
n.Cc=function(){Jf(this,"E_CSS_UNEXPECTED_FONT_FACE")};n.gc=function(){Jf(this,"E_CSS_UNEXPECTED_FOOTNOTE")};n.Gc=function(){Jf(this,"E_CSS_UNEXPECTED_VIEWPORT")};n.Ac=function(){Jf(this,"E_CSS_UNEXPECTED_DEFINE")};n.Fc=function(){Jf(this,"E_CSS_UNEXPECTED_REGION")};n.Ob=function(){Jf(this,"E_CSS_UNEXPECTED_PAGE")};n.Eb=function(){Jf(this,"E_CSS_UNEXPECTED_WHEN")};n.Bc=function(){Jf(this,"E_CSS_UNEXPECTED_FLOW")};n.Ec=function(){Jf(this,"E_CSS_UNEXPECTED_PAGE_TEMPLATE")};n.Dc=function(){Jf(this,"E_CSS_UNEXPECTED_PAGE_MASTER")};
n.jc=function(){Jf(this,"E_CSS_UNEXPECTED_PARTITION")};n.ic=function(){Jf(this,"E_CSS_UNEXPECTED_PARTITION_GROUP")};n.hc=function(){Jf(this,"E_CSS_UNEXPECTED_SELECTOR_FUNC")};n.rc=function(){Jf(this,"E_CSS_UNEXPECTED_END_SELECTOR_FUNC")};n.eb=function(){this.error("E_CSS_UNEXPECTED_PROPERTY",this.Yb())};var Kf=[],Lf=[],Q=[],Mf=[],Nf=[],Of=[],Pf=[],Qf=[],R=[],Rf=[],Sf=[],Tf=[],Uf=[];Kf[1]=28;Kf[36]=29;Kf[7]=29;Kf[9]=29;Kf[14]=29;Kf[18]=29;Kf[20]=30;Kf[13]=27;Kf[0]=200;Lf[1]=46;Lf[0]=200;Of[1]=2;
Of[36]=4;Of[7]=6;Of[9]=8;Of[14]=10;Of[18]=14;Q[37]=11;Q[23]=12;Q[35]=56;Q[1]=1;Q[36]=3;Q[7]=5;Q[9]=7;Q[14]=9;Q[12]=13;Q[18]=55;Q[50]=42;Q[16]=41;Mf[1]=1;Mf[36]=3;Mf[7]=5;Mf[9]=7;Mf[14]=9;Mf[11]=200;Mf[18]=55;Nf[1]=2;Nf[36]=4;Nf[7]=6;Nf[9]=8;Nf[18]=14;Nf[50]=42;Nf[14]=10;Nf[12]=13;Pf[1]=15;Pf[7]=16;Pf[4]=17;Pf[5]=18;Pf[3]=19;Pf[2]=20;Pf[8]=21;Pf[16]=22;Pf[19]=23;Pf[6]=24;Pf[11]=25;Pf[17]=26;Pf[13]=48;Pf[31]=47;Pf[23]=54;Pf[0]=44;Qf[1]=31;Qf[4]=32;Qf[5]=32;Qf[3]=33;Qf[2]=34;Qf[10]=40;Qf[6]=38;
Qf[31]=36;Qf[24]=36;Qf[32]=35;R[1]=45;R[16]=37;R[37]=37;R[38]=37;R[47]=37;R[48]=37;R[39]=37;R[49]=37;R[26]=37;R[25]=37;R[23]=37;R[24]=37;R[19]=37;R[21]=37;R[36]=37;R[18]=37;R[22]=37;R[11]=39;R[12]=43;R[17]=49;Rf[0]=200;Rf[12]=50;Rf[13]=51;Rf[14]=50;Rf[15]=51;Rf[10]=50;Rf[11]=51;Rf[17]=53;Sf[0]=200;Sf[12]=50;Sf[13]=52;Sf[14]=50;Sf[15]=51;Sf[10]=50;Sf[11]=51;Sf[17]=53;Tf[0]=200;Tf[12]=50;Tf[13]=51;Tf[14]=50;Tf[15]=51;Tf[10]=50;Tf[11]=51;Uf[11]=0;Uf[16]=0;Uf[22]=1;Uf[18]=1;Uf[26]=2;Uf[25]=2;Uf[38]=3;
Uf[37]=3;Uf[48]=3;Uf[47]=3;Uf[39]=3;Uf[49]=3;Uf[41]=3;Uf[23]=4;Uf[24]=4;Uf[36]=5;Uf[19]=5;Uf[21]=5;Uf[0]=6;Uf[52]=2;function Vf(a,b,c,d){this.b=a;this.d=b;this.j=c;this.Y=d;this.u=[];this.G={};this.e=this.D=null;this.l=!1;this.g=2;this.w=null;this.B=!1;this.k=this.F=null;this.h=[];this.f=[];this.N=this.O=!1}function Wf(a,b){for(var c=[],d=a.u;;){c.push(d[b++]);if(b==d.length)break;if(","!=d[b++])throw Error("Unexpected state");}return c}
function Xf(a,b,c){var d=a.u,e=d.length,f;do f=d[--e];while("undefined"!=typeof f&&"string"!=typeof f);var g=d.length-(e+1);1<g&&d.splice(e+1,g,new ed(d.slice(e+1,d.length)));if(","==b)return null;e++;do f=d[--e];while("undefined"!=typeof f&&("string"!=typeof f||","==f));g=d.length-(e+1);if("("==f){if(")"!=b)return a.j.error("E_CSS_MISMATCHED_C_PAR",c),a.b=Sf,null;a=new gd(d[e-1],Wf(a,e+1));d.splice(e-1,g+2,a);return null}return";"!=b||0<=e?(a.j.error("E_CSS_UNEXPECTED_VAL_END",c),a.b=Sf,null):1<
g?new fd(Wf(a,e+1)):d[0]}function Yf(a,b,c){a.b=a.e?Sf:Rf;a.j.error(b,c)}
function Zf(a,b,c){for(var d=a.u,e=a.j,f=d.pop(),g;;){var h=d.pop();if(11==b){for(g=[f];16==h;)g.unshift(d.pop()),h=d.pop();if("string"==typeof h){if("{"==h){for(;2<=g.length;)a=g.shift(),c=g.shift(),a=new Gc(e.Z(),a,c),g.unshift(a);d.push(new I(g[0]));return!0}if("("==h){b=d.pop();f=d.pop();f=new Vc(e.Z(),dc(f,b),g);b=0;continue}}if(10==h){f.yd()&&(f=new Xc(e.Z(),f,null));b=0;continue}}else if("string"==typeof h){d.push(h);break}if(0>h)if(-31==h)f=new Bc(e.Z(),f);else if(-24==h)f=new Cc(e.Z(),f);
else return Yf(a,"F_UNEXPECTED_STATE",c),!1;else{if(Uf[b]>Uf[h]){d.push(h);break}g=d.pop();switch(h){case 26:f=new Dc(e.Z(),g,f);break;case 52:f=new Ec(e.Z(),g,f);break;case 25:f=new Fc(e.Z(),g,f);break;case 38:f=new Hc(e.Z(),g,f);break;case 37:f=new Jc(e.Z(),g,f);break;case 48:f=new Ic(e.Z(),g,f);break;case 47:f=new Kc(e.Z(),g,f);break;case 39:case 49:f=new Lc(e.Z(),g,f);break;case 41:f=new Mc(e.Z(),g,f);break;case 23:f=new Nc(e.Z(),g,f);break;case 24:f=new Oc(e.Z(),g,f);break;case 36:f=new Pc(e.Z(),
g,f);break;case 19:f=new Qc(e.Z(),g,f);break;case 21:f=new Rc(e.Z(),g,f);break;case 18:if(1<d.length)switch(d[d.length-1]){case 22:d.pop();f=new Wc(e.Z(),d.pop(),g,f);break;case 10:if(g.yd())f=new Xc(e.Z(),g,f);else return Yf(a,"E_CSS_MEDIA_TEST",c),!1}else return Yf(a,"E_CSS_EXPR_COND",c),!1;break;case 22:if(18!=b)return Yf(a,"E_CSS_EXPR_COND",c),!1;case 10:return d.push(g),d.push(h),d.push(f),!1;default:return Yf(a,"F_UNEXPECTED_STATE",c),!1}}}d.push(f);return!1}
function $f(a){for(var b=[];;){var c=x(a.d);switch(c.type){case 1:b.push(c.text);break;case 23:b.push("+");break;case 4:case 5:b.push(c.C);break;default:return b}A(a.d)}}
function ag(a){var b=!1,c=x(a.d);if(23===c.type)b=!0,A(a.d),c=x(a.d);else if(1===c.type&&("even"===c.text||"odd"===c.text))return A(a.d),[2,"odd"===c.text?1:0];switch(c.type){case 3:if(b&&0>c.C)break;case 1:if(b&&"-"===c.text.charAt(0))break;if("n"===c.text||"-n"===c.text){if(b&&c.b)break;b="-n"===c.text?-1:1;3===c.type&&(b=c.C);var d=0;A(a.d);var c=x(a.d),e=24===c.type,f=23===c.type||e;f&&(A(a.d),c=x(a.d));if(5===c.type){d=c.C;if(1/d===1/-0){if(d=0,f)break}else if(0>d){if(f)break}else if(0<=d&&!f)break;
A(a.d)}else if(f)break;return[b,e&&0<d?-d:d]}if("n-"===c.text||"-n-"===c.text){if(b&&c.b)break;b="-n-"===c.text?-1:1;3===c.type&&(b=c.C);A(a.d);c=x(a.d);if(5===c.type&&!(0>c.C||1/c.C===1/-0))return A(a.d),[b,c.C]}else{if(d=c.text.match(/^n(-[0-9]+)$/)){if(b&&c.b)break;A(a.d);return[3===c.type?c.C:1,parseInt(d[1],10)]}if(d=c.text.match(/^-n(-[0-9]+)$/))return A(a.d),[-1,parseInt(d[1],10)]}break;case 5:if(b&&(c.b||0>c.C))break;A(a.d);return[0,c.C]}return null}
function bg(a,b,c){a=a.j.Z();if(!a)return null;c=c||a.g;if(b){b=b.split(/\s+/);for(var d=0;d<b.length;d++)switch(b[d]){case "vertical":c=Zc(a,c,new Bc(a,new Tc(a,"pref-horizontal")));break;case "horizontal":c=Zc(a,c,new Tc(a,"pref-horizontal"));break;case "day":c=Zc(a,c,new Bc(a,new Tc(a,"pref-night-mode")));break;case "night":c=Zc(a,c,new Tc(a,"pref-night-mode"));break;default:c=a.f}}return c===a.g?null:new I(c)}
function cg(a){switch(a.f[a.f.length-1]){case "[selector]":case "font-face":case "-epubx-flow":case "-epubx-viewport":case "-epubx-define":case "-adapt-footnote-area":return!0}return!1}
function dg(a,b,c,d,e,f){var g=a.j,h=a.d,l=a.u,k,m,p,r;e&&(a.g=2,a.u.push("{"));a:for(;0<b;--b)switch(k=x(h),a.b[k.type]){case 28:if(18!=z(h,1).type){cg(a)?(g.error("E_CSS_COLON_EXPECTED",z(h,1)),a.b=Sf):(a.b=Of,g.gb());continue}m=z(h,2);if(!(m.b||1!=m.type&&6!=m.type)){if(0<=h.b)throw Error("F_CSSTOK_BAD_CALL mark");h.b=h.d}a.e=k.text;a.l=!1;A(h);A(h);a.b=Pf;l.splice(0,l.length);continue;case 46:if(18!=z(h,1).type){a.b=Sf;g.error("E_CSS_COLON_EXPECTED",z(h,1));continue}a.e=k.text;a.l=!1;A(h);A(h);
a.b=Pf;l.splice(0,l.length);continue;case 29:a.b=Of;g.gb();continue;case 1:if(!k.b){a.b=Tf;g.error("E_CSS_SPACE_EXPECTED",k);continue}g.mb();case 2:if(34==z(h,1).type)if(A(h),A(h),p=a.G[k.text],null!=p)switch(k=x(h),k.type){case 1:g.jb(p,k.text);a.b=f?Mf:Q;A(h);break;case 36:g.jb(p,null);a.b=f?Mf:Q;A(h);break;default:a.b=Rf,g.error("E_CSS_NAMESPACE",k)}else a.b=Rf,g.error("E_CSS_UNDECLARED_PREFIX",k);else g.jb(a.D,k.text),a.b=f?Mf:Q,A(h);continue;case 3:if(!k.b){a.b=Tf;g.error("E_CSS_SPACE_EXPECTED",
k);continue}g.mb();case 4:if(34==z(h,1).type)switch(A(h),A(h),k=x(h),k.type){case 1:g.jb(null,k.text);a.b=f?Mf:Q;A(h);break;case 36:g.jb(null,null);a.b=f?Mf:Q;A(h);break;default:a.b=Rf,g.error("E_CSS_NAMESPACE",k)}else g.jb(a.D,null),a.b=f?Mf:Q,A(h);continue;case 5:k.b&&g.mb();case 6:g.Vc(k.text);a.b=f?Mf:Q;A(h);continue;case 7:k.b&&g.mb();case 8:g.Pc(k.text);a.b=f?Mf:Q;A(h);continue;case 55:k.b&&g.mb();case 14:A(h);k=x(h);b:switch(k.type){case 1:g.cc(k.text,null);A(h);a.b=f?Mf:Q;continue;case 6:m=
k.text;A(h);switch(m){case "not":a.b=Of;g.hc("not");dg(a,Number.POSITIVE_INFINITY,!1,!1,!1,!0)?a.b=Q:a.b=Tf;break a;case "lang":case "href-epub-type":if(k=x(h),1===k.type){p=[k.text];A(h);break}else break b;case "nth-child":case "nth-of-type":case "nth-last-child":case "nth-last-of-type":if(p=ag(a))break;else break b;default:p=$f(a)}k=x(h);if(11==k.type){g.cc(m,p);A(h);a.b=f?Mf:Q;continue}}g.error("E_CSS_PSEUDOCLASS_SYNTAX",k);a.b=Rf;continue;case 42:A(h);k=x(h);switch(k.type){case 1:g.dc(k.text,
null);a.b=f?Mf:Q;A(h);continue;case 6:if(m=k.text,A(h),p=$f(a),k=x(h),11==k.type){g.dc(m,p);a.b=f?Mf:Q;A(h);continue}}g.error("E_CSS_PSEUDOELEM_SYNTAX",k);a.b=Rf;continue;case 9:k.b&&g.mb();case 10:A(h);k=x(h);if(1==k.type)m=k.text,A(h);else if(36==k.type)m=null,A(h);else if(34==k.type)m="";else{a.b=Tf;g.error("E_CSS_ATTR",k);A(h);continue}k=x(h);if(34==k.type){p=m?a.G[m]:m;if(null==p){a.b=Tf;g.error("E_CSS_UNDECLARED_PREFIX",k);A(h);continue}A(h);k=x(h);if(1!=k.type){a.b=Tf;g.error("E_CSS_ATTR_NAME_EXPECTED",
k);continue}m=k.text;A(h);k=x(h)}else p="";switch(k.type){case 39:case 45:case 44:case 43:case 42:case 46:case 50:r=k.type;A(h);k=x(h);break;case 15:g.qc(p,m,0,null);a.b=f?Mf:Q;A(h);continue;default:a.b=Tf;g.error("E_CSS_ATTR_OP_EXPECTED",k);continue}switch(k.type){case 1:case 2:g.qc(p,m,r,k.text);A(h);k=x(h);break;default:a.b=Tf;g.error("E_CSS_ATTR_VAL_EXPECTED",k);continue}if(15!=k.type){a.b=Tf;g.error("E_CSS_ATTR",k);continue}a.b=f?Mf:Q;A(h);continue;case 11:g.Oc();a.b=Nf;A(h);continue;case 12:g.Nc();
a.b=Nf;A(h);continue;case 56:g.Sc();a.b=Nf;A(h);continue;case 13:a.O?(a.f.push("-epubx-region"),a.O=!1):a.N?(a.f.push("page"),a.N=!1):a.f.push("[selector]");g.pa();a.b=Kf;A(h);continue;case 41:g.Lb();a.b=Of;A(h);continue;case 15:l.push(G(k.text));A(h);continue;case 16:try{l.push(Af(k.text))}catch(w){g.error("E_CSS_COLOR",k),a.b=Rf}A(h);continue;case 17:l.push(new nd(k.C));A(h);continue;case 18:l.push(new od(k.C));A(h);continue;case 19:l.push(new H(k.C,k.text));A(h);continue;case 20:l.push(new ld(k.text));
A(h);continue;case 21:l.push(new qd(wa(k.text,a.Y)));A(h);continue;case 22:Xf(a,",",k);l.push(",");A(h);continue;case 23:l.push(kd);A(h);continue;case 24:m=k.text.toLowerCase();"-epubx-expr"==m?(a.b=Qf,a.g=0,l.push("{")):(l.push(m),l.push("("));A(h);continue;case 25:Xf(a,")",k);A(h);continue;case 47:A(h);k=x(h);m=z(h,1);if(1==k.type&&"important"==k.text.toLowerCase()&&(17==m.type||0==m.type||13==m.type)){A(h);a.l=!0;continue}Yf(a,"E_CSS_SYNTAX",k);continue;case 54:m=z(h,1);switch(m.type){case 4:case 3:case 5:if(!m.b){A(h);
continue}}a.b===Pf&&0<=h.b?(Wb(h),a.b=Of,g.gb()):Yf(a,"E_CSS_UNEXPECTED_PLUS",k);continue;case 26:A(h);case 48:h.b=-1;(m=Xf(a,";",k))&&a.e&&g.eb(a.e,m,a.l);a.b=d?Lf:Kf;continue;case 44:A(h);h.b=-1;m=Xf(a,";",k);if(c)return a.w=m,!0;a.e&&m&&g.eb(a.e,m,a.l);if(d)return!0;Yf(a,"E_CSS_SYNTAX",k);continue;case 31:m=z(h,1);9==m.type?(10!=z(h,2).type||z(h,2).b?(l.push(new Tc(g.Z(),dc(k.text,m.text))),a.b=R):(l.push(k.text,m.text,"("),A(h)),A(h)):(2==a.g||3==a.g?"not"==k.text.toLowerCase()?(A(h),l.push(new Uc(g.Z(),
!0,m.text))):("only"==k.text.toLowerCase()&&(A(h),k=m),l.push(new Uc(g.Z(),!1,k.text))):l.push(new Tc(g.Z(),k.text)),a.b=R);A(h);continue;case 38:l.push(null,k.text,"(");A(h);continue;case 32:l.push(new hc(g.Z(),k.C));A(h);a.b=R;continue;case 33:m=k.text;"%"==m&&(m=a.e&&a.e.match(/height|^(top|bottom)$/)?"vh":"vw");l.push(new Sc(g.Z(),k.C,m));A(h);a.b=R;continue;case 34:l.push(new hc(g.Z(),k.text));A(h);a.b=R;continue;case 35:A(h);k=x(h);5!=k.type||k.b?Yf(a,"E_CSS_SYNTAX",k):(l.push(new Yc(g.Z(),
k.C)),A(h),a.b=R);continue;case 36:l.push(-k.type);A(h);continue;case 37:a.b=Qf;Zf(a,k.type,k);l.push(k.type);A(h);continue;case 45:"and"==k.text.toLowerCase()?(a.b=Qf,Zf(a,52,k),l.push(52),A(h)):Yf(a,"E_CSS_SYNTAX",k);continue;case 39:Zf(a,k.type,k)&&(a.e?a.b=Pf:Yf(a,"E_CSS_UNBALANCED_PAR",k));A(h);continue;case 43:Zf(a,11,k)&&(a.e||3==a.g?Yf(a,"E_CSS_UNEXPECTED_BRC",k):(1==a.g?g.Eb(l.pop()):(k=l.pop(),g.Eb(k)),a.f.push("media"),g.pa(),a.b=Kf));A(h);continue;case 49:if(Zf(a,11,k))if(a.e||3!=a.g)Yf(a,
"E_CSS_UNEXPECTED_SEMICOL",k);else return a.k=l.pop(),a.B=!0,a.b=Kf,A(h),!1;A(h);continue;case 40:l.push(k.type);A(h);continue;case 27:a.b=Kf;A(h);g.nb();a.f.length&&a.f.pop();continue;case 30:m=k.text.toLowerCase();switch(m){case "import":A(h);k=x(h);if(2==k.type||8==k.type){a.F=k.text;A(h);k=x(h);if(17==k.type||0==k.type)return a.B=!0,A(h),!1;a.e=null;a.g=3;a.b=Qf;l.push("{");continue}g.error("E_CSS_IMPORT_SYNTAX",k);a.b=Rf;continue;case "namespace":A(h);k=x(h);switch(k.type){case 1:m=k.text;A(h);
k=x(h);if((2==k.type||8==k.type)&&17==z(h,1).type){a.G[m]=k.text;A(h);A(h);continue}break;case 2:case 8:if(17==z(h,1).type){a.D=k.text;A(h);A(h);continue}}g.error("E_CSS_NAMESPACE_SYNTAX",k);a.b=Rf;continue;case "charset":A(h);k=x(h);if(2==k.type&&17==z(h,1).type){m=k.text.toLowerCase();"utf-8"!=m&&"utf-16"!=m&&g.error("E_CSS_UNEXPECTED_CHARSET "+m,k);A(h);A(h);continue}g.error("E_CSS_CHARSET_SYNTAX",k);a.b=Rf;continue;case "font-face":case "-epubx-page-template":case "-epubx-define":case "-epubx-viewport":if(12==
z(h,1).type){A(h);A(h);switch(m){case "font-face":g.Cc();break;case "-epubx-page-template":g.Ec();break;case "-epubx-define":g.Ac();break;case "-epubx-viewport":g.Gc()}a.f.push(m);g.pa();continue}break;case "-adapt-footnote-area":A(h);k=x(h);switch(k.type){case 12:A(h);g.gc(null);a.f.push(m);g.pa();continue;case 50:if(A(h),k=x(h),1==k.type&&12==z(h,1).type){m=k.text;A(h);A(h);g.gc(m);a.f.push("-adapt-footnote-area");g.pa();continue}}break;case "-epubx-region":A(h);g.Fc();a.O=!0;a.b=Of;continue;case "page":A(h);
g.Ob();a.N=!0;a.b=Nf;continue;case "top-left-corner":case "top-left":case "top-center":case "top-right":case "top-right-corner":case "right-top":case "right-middle":case "right-bottom":case "bottom-right-corner":case "bottom-right":case "bottom-center":case "bottom-left":case "bottom-left-corner":case "left-bottom":case "left-middle":case "left-top":A(h);k=x(h);if(12==k.type){A(h);g.jd(m);a.f.push(m);g.pa();continue}break;case "-epubx-when":A(h);a.e=null;a.g=1;a.b=Qf;l.push("{");continue;case "media":A(h);
a.e=null;a.g=2;a.b=Qf;l.push("{");continue;case "-epubx-flow":if(1==z(h,1).type&&12==z(h,2).type){g.Bc(z(h,1).text);A(h);A(h);A(h);a.f.push(m);g.pa();continue}break;case "-epubx-page-master":case "-epubx-partition":case "-epubx-partition-group":A(h);k=x(h);r=p=null;var q=[];1==k.type&&(p=k.text,A(h),k=x(h));18==k.type&&1==z(h,1).type&&(r=z(h,1).text,A(h),A(h),k=x(h));for(;6==k.type&&"class"==k.text.toLowerCase()&&1==z(h,1).type&&11==z(h,2).type;)q.push(z(h,1).text),A(h),A(h),A(h),k=x(h);if(12==k.type){A(h);
switch(m){case "-epubx-page-master":g.Dc(p,r,q);break;case "-epubx-partition":g.jc(p,r,q);break;case "-epubx-partition-group":g.ic(p,r,q)}a.f.push(m);g.pa();continue}break;case "":g.error("E_CSS_UNEXPECTED_AT"+m,k);a.b=Tf;continue;default:g.error("E_CSS_AT_UNKNOWN "+m,k);a.b=Rf;continue}g.error("E_CSS_AT_SYNTAX "+m,k);a.b=Rf;continue;case 50:if(c||d)return!0;a.h.push(k.type+1);A(h);continue;case 52:if(c||d)return!0;if(0==a.h.length){a.b=Kf;continue}case 51:0<a.h.length&&a.h[a.h.length-1]==k.type&&
a.h.pop();0==a.h.length&&13==k.type&&(a.b=Kf);A(h);continue;case 53:if(c||d)return!0;0==a.h.length&&(a.b=Kf);A(h);continue;case 200:return f&&(A(h),g.rc()),!0;default:if(c||d)return!0;if(e)return Zf(a,11,k)?(a.w=l.pop(),!0):!1;if(f)return 51==k.type?g.error(k.text,k):g.error("E_CSS_SYNTAX",k),!1;if(a.b===Pf&&0<=h.b){Wb(h);a.b=Of;g.gb();continue}if(a.b!==Rf&&a.b!==Tf&&a.b!==Sf){51==k.type?g.error(k.text,k):g.error("E_CSS_SYNTAX",k);a.b=cg(a)?Sf:Tf;continue}A(h)}return!1}
function eg(a){Bf.call(this,null);this.d=a}t(eg,Bf);eg.prototype.error=function(a){throw Error(a);};eg.prototype.Z=function(){return this.d};
function fg(a,b,c,d,e){var f=L("parseStylesheet"),g=new Vf(Kf,a,b,c),h=null;e&&(h=gg(new Ub(e,b),b,c));if(h=bg(g,d,h&&h.ka()))b.Eb(h),b.pa();pf(function(){for(;!dg(g,100,!1,!1,!1,!1);){if(g.B){var a=wa(g.F,c);g.k&&(b.Eb(g.k),b.pa());var d=L("parseStylesheet.import");hg(a,b,null,null).then(function(){g.k&&b.nb();g.B=!1;g.F=null;g.k=null;O(d,!0)});return N(d)}a=nf();if(a.Ca)return a}return M(!1)}).then(function(){h&&b.nb();O(f,!0)});return N(f)}
function ig(a,b,c,d,e){return Ye("parseStylesheetFromText",function(f){var g=new Ub(a,b);fg(g,b,c,d,e).ua(f)},function(b,c){u.b(c,"Failed to parse stylesheet text: "+a);O(b,!1)})}function hg(a,b,c,d){return Ye("parseStylesheetFromURL",function(e){tf(a).then(function(f){f.responseText?ig(f.responseText,b,a,c,d).then(function(b){b||u.b("Failed to parse stylesheet from "+a);O(e,!0)}):O(e,!0)})},function(b,c){u.b(c,"Exception while fetching and parsing:",a);O(b,!0)})}
function jg(a,b){var c=new Vf(Pf,b,new eg(a),"");dg(c,Number.POSITIVE_INFINITY,!0,!1,!1,!1);return c.w}function gg(a,b,c){a=new Vf(Qf,a,b,c);dg(a,Number.POSITIVE_INFINITY,!1,!1,!0,!1);return a.w}var kg={"z-index":!0,"column-count":!0,"flow-linger":!0,opacity:!0,page:!0,"flow-priority":!0,utilization:!0};
function lg(a,b,c){if(b.xd())a:{b=b.d;a=b.evaluate(a);switch(typeof a){case "number":c=kg[c]?a==Math.round(a)?new od(a):new nd(a):new H(a,"px");break a;case "string":c=a?jg(b.b,new Ub(a,null)):F;break a;case "boolean":c=a?ke:Gd;break a;case "undefined":c=F;break a}throw Error("E_UNEXPECTED");}else c=b;return c};function mg(){this.b={}}t(mg,cd);mg.prototype.ub=function(a){this.b[a.name]=!0;return a};mg.prototype.hb=function(a){this.vb(a.values);return a};function ng(a){this.value=a}t(ng,cd);ng.prototype.Sb=function(a){this.value=a.C;return a};function og(a,b){if(a){var c=new ng(b);try{return a.U(c),c.value}catch(d){u.b(d,"toInt: ")}}return b}function pg(){this.d=!1;this.b=[];this.name=null}t(pg,cd);pg.prototype.Ub=function(a){this.d&&this.b.push(a);return null};
pg.prototype.Tb=function(a){this.d&&0==a.C&&this.b.push(new H(0,"px"));return null};pg.prototype.hb=function(a){this.vb(a.values);return null};pg.prototype.kb=function(a){this.d||(this.d=!0,this.vb(a.values),this.d=!1,this.name=a.name.toLowerCase());return null};
function qg(a,b,c,d,e,f){if(a){var g=new pg;try{a.U(g);var h;a:{if(0<g.b.length){a=[];for(var l=0;l<g.b.length;l++){var k=g.b[l];if("%"==k.X){var m=0==l%2?d:e;3==l&&"circle"==g.name&&(m=Math.sqrt((d*d+e*e)/2));a.push(k.C*m/100)}else a.push(k.C*qc(f,k.X,!1))}switch(g.name){case "polygon":if(0==a.length%2){f=[];for(g=0;g<a.length;g+=2)f.push({x:b+a[g],y:c+a[g+1]});h=new xe(f);break a}break;case "rectangle":if(4==a.length){h=Ae(b+a[0],c+a[1],b+a[0]+a[2],c+a[1]+a[3]);break a}break;case "ellipse":if(4==
a.length){h=ze(b+a[0],c+a[1],a[2],a[3]);break a}break;case "circle":if(3==a.length){h=ze(b+a[0],c+a[1],a[2],a[2]);break a}}}h=null}return h}catch(p){u.b(p,"toShape:")}}return Ae(b,c,b+d,c+e)}function rg(a){this.d=a;this.b={};this.name=null}t(rg,cd);rg.prototype.ub=function(a){this.name=a.toString();this.b[this.name]=this.d?0:(this.b[this.name]||0)+1;return a};rg.prototype.Sb=function(a){this.name&&(this.b[this.name]+=a.C-(this.d?0:1));return a};rg.prototype.hb=function(a){this.vb(a.values);return a};
function sg(a,b){var c=new rg(b);try{a.U(c)}catch(d){u.b(d,"toCounters:")}return c.b};function yf(a,b){this.sc=a;this.name=b;this.d=!1;this.b=this.f=null;this.e=[]}yf.prototype.start=function(){if(!this.b){var a=this;this.b=af(Te.d,function(){var b=L("Fetcher.run");a.sc().then(function(c){var d=a.e;a.d=!0;a.f=c;a.b=null;a.e=[];if(d)for(var e=0;e<d.length;e++)try{d[e](c)}catch(f){u.error(f,"Error:")}O(b,c)});return N(b)},this.name)}};function tg(a,b){a.d?b(a.f):a.e.push(b)}yf.prototype.get=function(){if(this.d)return M(this.f);this.start();return this.b.join()};
function ug(a){if(0==a.length)return M(!0);if(1==a.length)return a[0].get().kd(!0);var b=L("waitForFetches"),c=0;pf(function(){for(;c<a.length;){var b=a[c++];if(!b.d)return b.get().kd(!0)}return M(!1)}).then(function(){O(b,!0)});return N(b)}
function vg(a,b){var c=null,d=null;"img"==a.localName&&(c=a.getAttribute("width"),d=a.getAttribute("height"));var e=new yf(function(){function e(b){"img"==a.localName&&(c||a.removeAttribute("width"),d||a.removeAttribute("height"));h.Ta(b?b.type:"timeout")}var g=L("loadImage"),h=hf(g,a);a.addEventListener("load",e,!1);a.addEventListener("error",e,!1);a.addEventListener("abort",e,!1);"http://www.w3.org/2000/svg"==a.namespaceURI?(a.setAttributeNS("http://www.w3.org/1999/xlink","xlink:href",b),setTimeout(e,
300)):a.src=b;return N(g)},"loadElement "+b);e.start();return e};function wg(a){this.e=this.f=null;this.d=0;this.b=a}function xg(a,b){this.b=-1;this.d=a;this.e=b}function yg(){this.b=[];this.d=[];this.match=[];this.e=[];this.error=[];this.f=!0}function zg(a,b,c){for(var d=0;d<b.length;d++)a.d[b[d]].b=c;b.splice(0,b.length)}
yg.prototype.clone=function(){for(var a=new yg,b=0;b<this.b.length;b++){var c=this.b[b],d=new wg(c.b);d.d=c.d;a.b.push(d)}for(b=0;b<this.d.length;b++)c=this.d[b],d=new xg(c.d,c.e),d.b=c.b,a.d.push(d);a.match.push.apply(a.match,this.match);a.e.push.apply(a.e,this.e);a.error.push.apply(a.error,this.error);return a};
function Ag(a,b,c,d){var e=a.b.length,f=new wg(Bg);f.d=0<=d?c?2*d+1:2*d+2:c?-1:-2;a.b.push(f);zg(a,b,e);c=new xg(e,!0);e=new xg(e,!1);b.push(a.d.length);a.d.push(e);b.push(a.d.length);a.d.push(c)}function Cg(a){return 1==a.b.length&&0==a.b[0].d&&a.b[0].b instanceof Dg}
function Eg(a,b,c){if(0!=b.b.length){var d=a.b.length;if(4==c&&1==d&&Cg(b)&&Cg(a)){c=a.b[0].b;b=b.b[0].b;var d={},e={},f;for(f in c.d)d[f]=c.d[f];for(f in b.d)d[f]=b.d[f];for(var g in c.e)e[g]=c.e[g];for(g in b.e)e[g]=b.e[g];a.b[0].b=new Dg(c.b|b.b,d,e)}else{for(f=0;f<b.b.length;f++)a.b.push(b.b[f]);4==c?(a.f=!0,zg(a,a.e,d)):zg(a,a.match,d);g=a.d.length;for(f=0;f<b.d.length;f++)e=b.d[f],e.d+=d,0<=e.b&&(e.b+=d),a.d.push(e);for(f=0;f<b.match.length;f++)a.match.push(b.match[f]+g);3==c&&zg(a,a.match,
d);if(2==c||3==c)for(f=0;f<b.e.length;f++)a.match.push(b.e[f]+g);else if(a.f){for(f=0;f<b.e.length;f++)a.e.push(b.e[f]+g);a.f=b.f}else for(f=0;f<b.e.length;f++)a.error.push(b.e[f]+g);for(f=0;f<b.error.length;f++)a.error.push(b.error[f]+g);b.b=null;b.d=null}}}var T={};function Fg(){}t(Fg,cd);Fg.prototype.f=function(a,b){var c=a[b].U(this);return c?[c]:null};function Dg(a,b,c){this.b=a;this.d=b;this.e=c}t(Dg,Fg);n=Dg.prototype;n.nd=function(a){return this.b&1?a:null};
n.od=function(a){return this.b&2048?a:null};n.lc=function(a){return this.b&2?a:null};n.ub=function(a){var b=this.d[a.name.toLowerCase()];return b?b:this.b&4?a:null};n.Ub=function(a){return 0!=a.C||this.b&512?0>a.C&&!(this.b&256)?null:this.e[a.X]?a:null:"%"==a.X&&this.b&1024?a:null};n.Tb=function(a){return 0==a.C?this.b&512?a:null:0>=a.C&&!(this.b&256)?null:this.b&16?a:null};n.Sb=function(a){return 0==a.C?this.b&512?a:null:0>=a.C&&!(this.b&256)?null:this.b&48?a:(a=this.d[""+a.C])?a:null};
n.Ic=function(a){return this.b&64?a:null};n.mc=function(a){return this.b&128?a:null};n.hb=function(){return null};n.tb=function(){return null};n.kb=function(){return null};n.Rb=function(){return null};var Bg=new Dg(0,T,T);
function Gg(a){this.b=new wg(null);var b=this.e=new wg(null),c=a.b.length;a.b.push(this.b);a.b.push(b);zg(a,a.match,c);zg(a,a.e,c+1);zg(a,a.error,c+1);for(b=0;b<a.d.length;b++){var d=a.d[b];d.e?a.b[d.d].f=a.b[d.b]:a.b[d.d].e=a.b[d.b]}for(b=0;b<c;b++)if(null==a.b[b].e||null==a.b[b].f)throw Error("Invalid validator state");this.d=a.b[0]}t(Gg,Fg);
function Hg(a,b,c,d){for(var e=c?[]:b,f=a.d,g=d,h=null,l=null;f!==a.b&&f!==a.e;)if(g>=b.length)f=f.e;else{var k=b[g],m=k;if(0!=f.d)m=!0,-1==f.d?(h?h.push(l):h=[l],l=[]):-2==f.d?0<h.length?l=h.pop():l=null:0<f.d&&0==f.d%2?l[Math.floor((f.d-1)/2)]="taken":m=null==l[Math.floor((f.d-1)/2)],f=m?f.f:f.e;else{if(0==g&&!c&&f.b instanceof Ig&&a instanceof Ig){if(m=(new ed(b)).U(f.b)){g=b.length;f=f.f;continue}}else if(0==g&&!c&&f.b instanceof Jg&&a instanceof Ig){if(m=(new fd(b)).U(f.b)){g=b.length;f=f.f;
continue}}else m=k.U(f.b);if(m){if(m!==k&&b===e)for(e=[],k=0;k<g;k++)e[k]=b[k];b!==e&&(e[g-d]=m);g++;f=f.f}else f=f.e}}return f===a.b&&(c?0<e.length:g==b.length)?e:null}n=Gg.prototype;n.Xa=function(a){for(var b=null,c=this.d;c!==this.b&&c!==this.e;)a?0!=c.d?c=c.f:(b=a.U(c.b))?(a=null,c=c.f):c=c.e:c=c.e;return c===this.b?b:null};n.nd=function(a){return this.Xa(a)};n.od=function(a){return this.Xa(a)};n.lc=function(a){return this.Xa(a)};n.ub=function(a){return this.Xa(a)};n.Ub=function(a){return this.Xa(a)};
n.Tb=function(a){return this.Xa(a)};n.Sb=function(a){return this.Xa(a)};n.Ic=function(a){return this.Xa(a)};n.mc=function(a){return this.Xa(a)};n.hb=function(){return null};n.tb=function(){return null};n.kb=function(a){return this.Xa(a)};n.Rb=function(){return null};function Ig(a){Gg.call(this,a)}t(Ig,Gg);Ig.prototype.hb=function(a){var b=Hg(this,a.values,!1,0);return b===a.values?a:b?new ed(b):null};
Ig.prototype.tb=function(a){for(var b=this.d,c=!1;b;){if(b.b instanceof Jg){c=!0;break}b=b.e}return c?(b=Hg(this,a.values,!1,0),b===a.values?a:b?new fd(b):null):null};Ig.prototype.f=function(a,b){return Hg(this,a,!0,b)};function Jg(a){Gg.call(this,a)}t(Jg,Gg);Jg.prototype.hb=function(a){return this.Xa(a)};Jg.prototype.tb=function(a){var b=Hg(this,a.values,!1,0);return b===a.values?a:b?new fd(b):null};Jg.prototype.f=function(a,b){for(var c=this.d,d;c!==this.e;){if(d=c.b.f(a,b))return d;c=c.e}return null};
function Kg(a,b){Gg.call(this,b);this.name=a}t(Kg,Gg);Kg.prototype.Xa=function(){return null};Kg.prototype.kb=function(a){if(a.name.toLowerCase()!=this.name)return null;var b=Hg(this,a.values,!1,0);return b===a.values?a:b?new gd(a.name,b):null};function Lg(){}Lg.prototype.b=function(a,b){return b};Lg.prototype.e=function(){};function Mg(a,b){this.name=b;this.f=a.e[this.name]}t(Mg,Lg);
Mg.prototype.b=function(a,b,c){if(c.values[this.name])return b;if(a=this.f.f(a,b)){var d=a.length;this.e(1<d?new ed(a):a[0],c);return b+d}return b};Mg.prototype.e=function(a,b){b.values[this.name]=a};function Ng(a,b){Mg.call(this,a,b[0]);this.d=b}t(Ng,Mg);Ng.prototype.e=function(a,b){for(var c=0;c<this.d.length;c++)b.values[this.d[c]]=a};function Og(a,b){this.d=a;this.Dd=b}t(Og,Lg);
Og.prototype.b=function(a,b,c){var d=b;if(this.Dd)if(a[b]==kd){if(++b==a.length)return d}else return d;var e=this.d[0].b(a,b,c);if(e==b)return d;b=e;for(d=1;d<this.d.length&&b<a.length;d++){e=this.d[d].b(a,b,c);if(e==b)break;b=e}return b};function Pg(){this.b=this.Va=null;this.error=!1;this.values={};this.d=null}n=Pg.prototype;n.clone=function(){var a=new this.constructor;a.Va=this.Va;a.b=this.b;a.d=this.d;return a};n.rd=function(a,b){this.Va=a;this.b=b};n.Hb=function(){this.error=!0;return 0};
function Qg(a,b){a.Hb([b]);return null}n.nd=function(a){return Qg(this,a)};n.lc=function(a){return Qg(this,a)};n.ub=function(a){return Qg(this,a)};n.Ub=function(a){return Qg(this,a)};n.Tb=function(a){return Qg(this,a)};n.Sb=function(a){return Qg(this,a)};n.Ic=function(a){return Qg(this,a)};n.mc=function(a){return Qg(this,a)};n.hb=function(a){this.Hb(a.values);return null};n.tb=function(){this.error=!0;return null};n.kb=function(a){return Qg(this,a)};n.Rb=function(){this.error=!0;return null};
function Rg(){Pg.call(this)}t(Rg,Pg);Rg.prototype.Hb=function(a){for(var b=0,c=0;b<a.length;){var d=this.Va[c].b(a,b,this);if(d>b)b=d,c=0;else if(++c==this.Va.length){this.error=!0;break}}return b};function Sg(){Pg.call(this)}t(Sg,Pg);Sg.prototype.Hb=function(a){if(a.length>this.Va.length||0==a.length)return this.error=!0,0;for(var b=0;b<this.Va.length;b++){for(var c=b;c>=a.length;)c=1==c?0:c-2;if(this.Va[b].b(a,c,this)!=c+1)return this.error=!0,0}return a.length};function Tg(){Pg.call(this)}
t(Tg,Pg);Tg.prototype.Hb=function(a){for(var b=a.length,c=0;c<a.length;c++)if(a[c]===kd){b=c;break}if(b>this.Va.length||0==a.length)return this.error=!0,0;for(c=0;c<this.Va.length;c++){for(var d=c;d>=b;)d=1==d?0:d-2;var e;if(b+1<a.length)for(e=b+c+1;e>=a.length;)e-=e==b+2?1:2;else e=d;if(2!=this.Va[c].b([a[d],a[e]],0,this))return this.error=!0,0}return a.length};function Ug(){Pg.call(this)}t(Ug,Rg);
Ug.prototype.tb=function(a){for(var b={},c=0;c<a.values.length;c++){this.values={};if(a.values[c]instanceof fd)this.error=!0;else{a.values[c].U(this);for(var d=b,e=this.values,f=0;f<this.b.length;f++){var g=this.b[f],h=e[g]||this.d.h[g],l=d[g];l||(l=[],d[g]=l);l.push(h)}this.values["background-color"]&&c!=a.values.length-1&&(this.error=!0)}if(this.error)return null}this.values={};for(var k in b)this.values[k]="background-color"==k?b[k].pop():new fd(b[k]);return null};function Vg(){Pg.call(this)}
t(Vg,Rg);Vg.prototype.rd=function(a,b){Rg.prototype.rd.call(this,a,b);this.b.push("font-family","line-height","font-size")};
Vg.prototype.Hb=function(a){var b=Rg.prototype.Hb.call(this,a);if(b+2>a.length)return this.error=!0,b;this.error=!1;var c=this.d.e;if(!a[b].U(c["font-size"]))return this.error=!0,b;this.values["font-size"]=a[b++];if(a[b]===kd){b++;if(b+2>a.length||!a[b].U(c["line-height"]))return this.error=!0,b;this.values["line-height"]=a[b++]}var d=b==a.length-1?a[b]:new ed(a.slice(b,a.length));if(!d.U(c["font-family"]))return this.error=!0,b;this.values["font-family"]=d;return a.length};
Vg.prototype.tb=function(a){a.values[0].U(this);if(this.error)return null;for(var b=[this.values["font-family"]],c=1;c<a.values.length;c++)b.push(a.values[c]);a=new fd(b);a.U(this.d.e["font-family"])?this.values["font-family"]=a:this.error=!0;return null};Vg.prototype.ub=function(a){if(a=this.d.d[a.name])for(var b in a)this.values[b]=a[b];else this.error=!0;return null};var Wg={SIMPLE:Rg,INSETS:Sg,INSETS_SLASH:Tg,COMMA:Ug,FONT:Vg};
function Xg(){this.e={};this.k={};this.h={};this.b={};this.d={};this.f={};this.j=[];this.g=[]}function Yg(a,b){var c;if(3==b.type)c=new H(b.C,b.text);else if(7==b.type)c=Af(b.text);else if(1==b.type)c=G(b.text);else throw Error("unexpected replacement");if(Cg(a)){var d=a.b[0].b.d,e;for(e in d)d[e]=c;return a}throw Error("unexpected replacement");}
function Zg(a,b,c){for(var d=new yg,e=0;e<b;e++)Eg(d,a.clone(),1);if(c==Number.POSITIVE_INFINITY)Eg(d,a,3);else for(e=b;e<c;e++)Eg(d,a.clone(),2);return d}function $g(a){var b=new yg,c=b.b.length;b.b.push(new wg(a));a=new xg(c,!0);var d=new xg(c,!1);zg(b,b.match,c);b.f?(b.e.push(b.d.length),b.f=!1):b.error.push(b.d.length);b.d.push(d);b.match.push(b.d.length);b.d.push(a);return b}
function ah(a,b){var c;switch(a){case "COMMA":c=new Jg(b);break;case "SPACE":c=new Ig(b);break;default:c=new Kg(a.toLowerCase(),b)}return $g(c)}
function bh(a){a.b.HASHCOLOR=$g(new Dg(64,T,T));a.b.POS_INT=$g(new Dg(32,T,T));a.b.POS_NUM=$g(new Dg(16,T,T));a.b.POS_PERCENTAGE=$g(new Dg(8,T,{"%":F}));a.b.NEGATIVE=$g(new Dg(256,T,T));a.b.ZERO=$g(new Dg(512,T,T));a.b.ZERO_PERCENTAGE=$g(new Dg(1024,T,T));a.b.POS_LENGTH=$g(new Dg(8,T,{em:F,ex:F,ch:F,rem:F,vh:F,vw:F,vmin:F,vmax:F,cm:F,mm:F,"in":F,px:F,pt:F,pc:F,q:F}));a.b.POS_ANGLE=$g(new Dg(8,T,{deg:F,grad:F,rad:F,turn:F}));a.b.POS_TIME=$g(new Dg(8,T,{s:F,ms:F}));a.b.FREQUENCY=$g(new Dg(8,T,{Hz:F,
kHz:F}));a.b.RESOLUTION=$g(new Dg(8,T,{dpi:F,dpcm:F,dppx:F}));a.b.URI=$g(new Dg(128,T,T));a.b.IDENT=$g(new Dg(4,T,T));a.b.STRING=$g(new Dg(2,T,T));var b={"font-family":G("sans-serif")};a.d.caption=b;a.d.icon=b;a.d.menu=b;a.d["message-box"]=b;a.d["small-caption"]=b;a.d["status-bar"]=b}function ch(a){return!!a.match(/^[A-Z_0-9]+$/)}
function dh(a,b,c){var d=x(b);if(0==d.type)return null;var e={"":!0};if(14==d.type){do{A(b);d=x(b);if(1!=d.type)throw Error("Prefix name expected");e[d.text]=!0;A(b);d=x(b)}while(16==d.type);if(15!=d.type)throw Error("']' expected");A(b);d=x(b)}if(1!=d.type)throw Error("Property name expected");if(2==c?"SHORTHANDS"==d.text:"DEFAULTS"==d.text)return A(b),null;d=d.text;A(b);if(2!=c){if(39!=x(b).type)throw Error("'=' expected");ch(d)||(a.k[d]=e)}else if(18!=x(b).type)throw Error("':' expected");return d}
function eh(a,b){for(;;){var c=dh(a,b,1);if(!c)break;for(var d=[],e=[],f="",g,h=!0,l=function(){if(0==d.length)throw Error("No values");var a;if(1==d.length)a=d[0];else{var b=f,c=d;a=new yg;if("||"==b){for(b=0;b<c.length;b++){var e=new yg,g=e;if(g.b.length)throw Error("invalid call");var h=new wg(Bg);h.d=2*b+1;g.b.push(h);var h=new xg(0,!0),k=new xg(0,!1);g.e.push(g.d.length);g.d.push(k);g.match.push(g.d.length);g.d.push(h);Eg(e,c[b],1);Ag(e,e.match,!1,b);Eg(a,e,0==b?1:4)}c=new yg;if(c.b.length)throw Error("invalid call");
Ag(c,c.match,!0,-1);Eg(c,a,3);a=[c.match,c.e,c.error];for(b=0;b<a.length;b++)Ag(c,a[b],!1,-1);a=c}else{switch(b){case " ":e=1;break;case "|":case "||":e=4;break;default:throw Error("unexpected op");}for(b=0;b<c.length;b++)Eg(a,c[b],0==b?1:e)}}return a},k=function(a){if(h)throw Error("'"+a+"': unexpected");if(f&&f!=a)throw Error("mixed operators: '"+a+"' and '"+f+"'");f=a;h=!0},m=null;!m;)switch(A(b),g=x(b),g.type){case 1:h||k(" ");if(ch(g.text)){var p=a.b[g.text];if(!p)throw Error("'"+g.text+"' unexpected");
d.push(p.clone())}else p={},p[g.text]=G(g.text),d.push($g(new Dg(0,p,T)));h=!1;break;case 5:p={};p[""+g.C]=new od(g.C);d.push($g(new Dg(0,p,T)));h=!1;break;case 34:k("|");break;case 25:k("||");break;case 14:h||k(" ");e.push({Fd:d,Bd:f,Vb:"["});f="";d=[];h=!0;break;case 6:h||k(" ");e.push({Fd:d,Bd:f,Vb:"(",Kb:g.text});f="";d=[];h=!0;break;case 15:g=l();p=e.pop();if("["!=p.Vb)throw Error("']' unexpected");d=p.Fd;d.push(g);f=p.Bd;h=!1;break;case 11:g=l();p=e.pop();if("("!=p.Vb)throw Error("')' unexpected");
d=p.Fd;d.push(ah(p.Kb,g));f=p.Bd;h=!1;break;case 18:if(h)throw Error("':' unexpected");A(b);d.push(Yg(d.pop(),x(b)));break;case 22:if(h)throw Error("'?' unexpected");d.push(Zg(d.pop(),0,1));break;case 36:if(h)throw Error("'*' unexpected");d.push(Zg(d.pop(),0,Number.POSITIVE_INFINITY));break;case 23:if(h)throw Error("'+' unexpected");d.push(Zg(d.pop(),1,Number.POSITIVE_INFINITY));break;case 12:A(b);g=x(b);if(5!=g.type)throw Error("<int> expected");var r=p=g.C;A(b);g=x(b);if(16==g.type){A(b);g=x(b);
if(5!=g.type)throw Error("<int> expected");r=g.C;A(b);g=x(b)}if(13!=g.type)throw Error("'}' expected");d.push(Zg(d.pop(),p,r));break;case 17:m=l();if(0<e.length)throw Error("unclosed '"+e.pop().Vb+"'");break;default:throw Error("unexpected token");}A(b);ch(c)?a.b[c]=m:a.e[c]=1!=m.b.length||0!=m.b[0].d?new Ig(m):m.b[0].b}}
function fh(a,b){for(var c={},d=0;d<b.length;d++)for(var e=b[d],f=a.f[e],e=f?f.b:[e],f=0;f<e.length;f++){var g=e[f],h=a.h[g];h?c[g]=h:u.b("Unknown property in makePropSet:",g)}return c}
function gh(a,b,c,d,e){var f="",g=b;b=b.toLowerCase();var h=b.match(/^-([a-z]+)-([-a-z0-9]+)$/);h&&(f=h[1],b=h[2]);if((h=a.k[b])&&h[f])if(f=a.e[b])(a=c===Ld||c.xd()?c:c.U(f))?e.fb(b,a,d):e.Zb(g,c);else if(b=a.f[b].clone(),c===Ld)for(c=0;c<b.b.length;c++)e.fb(b.b[c],Ld,d);else{c.U(b);if(b.error)d=!1;else{for(a=0;a<b.b.length;a++)f=b.b[a],e.fb(f,b.values[f]||b.d.h[f],d);d=!0}d||e.Zb(g,c)}else e.Hc(g,c)}
var hh=new yf(function(){var a=L("loadValidatorSet.load"),b=wa("validation.txt",va),c=tf(b),d=new Xg;bh(d);c.then(function(c){try{if(c.responseText){var f=new Ub(c.responseText,null);for(eh(d,f);;){var g=dh(d,f,2);if(!g)break;for(c=[];;){A(f);var h=x(f);if(17==h.type){A(f);break}switch(h.type){case 1:c.push(G(h.text));break;case 4:c.push(new nd(h.C));break;case 5:c.push(new od(h.C));break;case 3:c.push(new H(h.C,h.text));break;default:throw Error("unexpected token");}}d.h[g]=1<c.length?new ed(c):
c[0]}for(;;){var l=dh(d,f,3);if(!l)break;var k=z(f,1),m;1==k.type&&Wg[k.text]?(m=new Wg[k.text],A(f)):m=new Rg;m.d=d;g=!1;h=[];c=!1;for(var p=[],r=[];!g;)switch(A(f),k=x(f),k.type){case 1:if(d.e[k.text])h.push(new Mg(m.d,k.text)),r.push(k.text);else if(d.f[k.text]instanceof Sg){var w=d.f[k.text];h.push(new Ng(w.d,w.b));r.push.apply(r,w.b)}else throw Error("'"+k.text+"' is neither a simple property nor an inset shorthand");break;case 19:if(0<h.length||c)throw Error("unexpected slash");c=!0;break;case 14:p.push({Dd:c,
Va:h});h=[];c=!1;break;case 15:var q=new Og(h,c),y=p.pop(),h=y.Va;c=y.Dd;h.push(q);break;case 17:g=!0;A(f);break;default:throw Error("unexpected token");}m.rd(h,r);d.f[l]=m}d.g=fh(d,["background"]);d.j=fh(d,"margin border padding columns column-gap column-rule column-fill".split(" "))}else u.error("Error: missing",b)}catch(S){u.error(S,"Error:")}O(a,d)});return N(a)},"validatorFetcher");var ih={"font-style":Ud,"font-variant":Ud,"font-weight":Ud},jh="OTTO"+(new Date).valueOf(),kh=1;function lh(a,b){var c={},d;for(d in a)c[d]=a[d].evaluate(b,d);for(var e in ih)c[e]||(c[e]=ih[e]);return c}function mh(a){a=this.Cb=a;var b=new Ja,c;for(c in ih)b.append(" "),b.append(a[c].toString());this.d=b.toString();this.src=this.Cb.src?this.Cb.src.toString():null;this.e=[];this.f=[];this.b=(c=this.Cb["font-family"])?c.stringValue():null}
function nh(a,b,c){var d=new Ja;d.append("@font-face {\n  font-family: ");d.append(a.b);d.append(";\n  ");for(var e in ih)d.append(e),d.append(": "),a.Cb[e].Ba(d,!0),d.append(";\n  ");c?(d.append('src: url("'),b=(window.URL||window.webkitURL).createObjectURL(c),d.append(b),a.e.push(b),a.f.push(c),d.append('")')):(d.append("src: "),d.append(b));d.append(";\n}\n");return d.toString()}function oh(a){this.d=a;this.b={}}
function ph(a,b){if(b instanceof fd){for(var c=b.values,d=[],e=0;e<c.length;e++){var f=c[e],g=a.b[f.stringValue()];g&&d.push(G(g));d.push(f)}return new fd(d)}return(c=a.b[b.stringValue()])?new fd([G(c),b]):b}function qh(a,b){this.d=a;this.b=b;this.e={};this.f=0}function rh(a,b,c){b=b.b;var d=c.b[b];if(d)return d;d="Fnt_"+ ++a.f;return c.b[b]=d}
function sh(a,b,c,d){var e=L("initFont"),f=b.src,g={},h;for(h in ih)g[h]=b.Cb[h];d=rh(a,b,d);g["font-family"]=G(d);var l=new mh(g),k=a.b.ownerDocument.createElement("span");k.textContent="M";var m=(new Date).valueOf()+1E3;b=a.d.ownerDocument.createElement("style");h=jh+kh++;b.textContent=nh(l,"",uf([h]));a.d.appendChild(b);a.b.appendChild(k);k.style.visibility="hidden";k.style.fontFamily=d;for(var p in ih)v(k,p,g[p].toString());var g=k.getBoundingClientRect(),r=g.right-g.left,w=g.bottom-g.top;b.textContent=
nh(l,f,c);u.e("Starting to load font:",f);var q=!1;pf(function(){var a=k.getBoundingClientRect(),b=a.bottom-a.top;return r!=a.right-a.left||w!=b?(q=!0,M(!1)):(new Date).valueOf()>m?M(!1):of(10)}).then(function(){q?u.e("Loaded font:",f):u.b("Failed to load font:",f);a.b.removeChild(k);O(e,l)});return N(e)}
function th(a,b,c){var d=b.src,e=a.e[d];e?tg(e,function(a){if(a.d==b.d){var e=b.b,h=c.b[e];a=a.b;if(h){if(h!=a)throw Error("E_FONT_FAMILY_INCONSISTENT "+b.b);}else c.b[e]=a;u.b("Found already-loaded font:",d)}else u.b("E_FONT_FACE_INCOMPATIBLE",b.src)}):(e=new yf(function(){var e=L("loadFont"),g=c.d?c.d(d):null;g?tf(d,"blob").then(function(d){d.yc?g(d.yc).then(function(d){sh(a,b,d,c).ua(e)}):O(e,null)}):sh(a,b,null,c).ua(e);return N(e)},"loadFont "+d),a.e[d]=e,e.start());return e}
function uh(a,b,c){for(var d=[],e=0;e<b.length;e++){var f=b[e];f.src&&f.b?d.push(th(a,f,c)):u.b("E_FONT_FACE_INVALID")}return ug(d)};function vh(a,b,c){this.j=a;this.url=b;this.b=c;this.lang=null;this.f=-1;this.root=c.documentElement;a=null;if("http://www.w3.org/1999/xhtml"==this.root.namespaceURI){for(b=this.root.firstChild;b;b=b.nextSibling)if(1==b.nodeType&&(c=b,"http://www.w3.org/1999/xhtml"==c.namespaceURI))switch(c.localName){case "head":a=c}this.lang=this.root.getAttribute("lang")}else if("http://www.gribuser.ru/xml/fictionbook/2.0"==this.root.namespaceURI){a=this.root;for(b=this.root.firstChild;b;b=b.nextSibling);b=wh(wh(wh(wh(new xh([this.b]),
"FictionBook"),"description"),"title-info"),"lang").textContent();0<b.length&&(this.lang=b[0])}else if("http://example.com/sse"==this.root.namespaceURI)for(c=this.root.firstElementChild;c;c=c.nextElementSibling)"meta"===c.localName&&(a=c);this.h=a;this.e=this.root;this.g=1;this.e.setAttribute("data-adapt-eloff","0")}
function yh(a,b){var c=b.getAttribute("data-adapt-eloff");if(c)return parseInt(c,10);for(var c=a.g,d=a.e;d!=b;){var e=d.firstChild;if(!e)for(;!(e=d.nextSibling);)if(d=d.parentNode,null==d)throw Error("Internal error");d=e;1==e.nodeType?(e.setAttribute("data-adapt-eloff",c.toString()),++c):c+=e.textContent.length}a.g=c;a.e=b;return c-1}
function zh(a,b,c,d){var e=0,f=null;if(1==b.nodeType){if(!d)return yh(a,b)}else{e=c;f=b.previousSibling;if(!f)return b=b.parentNode,e+=1,yh(a,b)+e;b=f}for(;;){for(;b.lastChild;)b=b.lastChild;if(1==b.nodeType)break;e+=b.textContent.length;f=b.previousSibling;if(!f){b=b.parentNode;break}b=f}e+=1;return yh(a,b)+e}function Ah(a){0>a.f&&(a.f=zh(a,a.root,0,!0));return a.f}
function Bh(a,b){for(var c,d=a.root;;){c=yh(a,d);if(c>=b)return d;var e=d.children;if(!e)break;var f=Sa(e.length,function(c){return yh(a,e[c])>b});if(0==f)break;if(f<e.length&&yh(a,e[f])<=b)throw Error("Consistency check failed!");d=e[f-1]}c=c+1;for(var f=d,g=f.firstChild||f.nextSibling,h=null;;){if(g){if(1==g.nodeType)break;h=f=g;c+=g.textContent.length;if(c>b)break}else if(f=f.parentNode,!f)break;g=f.nextSibling}return h||d}
function Ch(a,b){var c=b.getAttribute("id");c&&!a.d[c]&&(a.d[c]=b);(c=b.getAttributeNS("http://www.w3.org/XML/1998/namespace","id"))&&!a.d[c]&&(a.d[c]=b);for(c=b.firstElementChild;c;c=c.nextElementSibling)Ch(a,c)}function Dh(a,b){var c=b.match(/([^#]*)\#(.+)$/);if(!c||c[1]&&c[1]!=a.url)return null;var c=c[2],d=a.b.getElementById(c);!d&&a.b.getElementsByName&&(d=a.b.getElementsByName(c)[0]);d||(a.d||(a.d={},Ch(a,a.b.documentElement)),d=a.d[c]);return d}
var Eh={De:"text/html",Ee:"text/xml",te:"application/xml",se:"application/xhtml_xml",ze:"image/svg+xml"};function Fh(a,b,c){c=c||new DOMParser;var d;try{d=c.parseFromString(a,b)}catch(e){}if(d){a=d.documentElement;if("parsererror"===a.localName)return null;for(a=a.firstChild;a;a=a.nextSibling)if("parsererror"===a.localName)return null}else return null;return d}
function Gh(a){var b=a.contentType;if(b){for(var c=Object.keys(Eh),d=0;d<c.length;d++)if(Eh[c[d]]===b)return b;if(b.match(/\+xml$/))return"application/xml"}if(a=a.url.match(/\.([^./]+)$/))switch(a[1]){case "html":case "htm":return"text/html";case "xhtml":case "xht":return"application/xhtml_xml";case "svg":case "svgz":return"image/svg+xml";case "opf":case "xml":return"application/xml"}return null}
function Hh(a,b){var c=a.responseXML;if(!c){var d=new DOMParser,e=a.responseText;if(e){var f=Gh(a);(c=Fh(e,f||"application/xml",d))&&!f&&(f=c.documentElement,"html"!==f.localName.toLowerCase()||f.namespaceURI?"svg"===f.localName.toLowerCase()&&"image/svg+xml"!==c.contentType&&(c=Fh(e,"image/svg+xml",d)):c=Fh(e,"text/html",d));c||(c=Fh(e,"text/html",d))}}c=c?new vh(b,a.url,c):null;return M(c)}function Ih(a){this.Kb=a}
function Jh(){var a=Kh;return new Ih(function(b){return a.Kb(b)&&1==b.nodeType&&"http://www.idpf.org/2008/embedding"==b.getAttribute("Algorithm")})}function Lh(){var a=Jh(),b=Kh;return new Ih(function(c){if(!b.Kb(c))return!1;c=new xh([c]);c=wh(c,"EncryptionMethod");a&&(c=Mh(c,a));return 0<c.b.length})}var Kh=new Ih(function(){return!0});function xh(a){this.b=a}function Nh(a){return a.b}function Mh(a,b){for(var c=[],d=0;d<a.b.length;d++){var e=a.b[d];b.Kb(e)&&c.push(e)}return new xh(c)}
function Oh(a,b){function c(a){d.push(a)}for(var d=[],e=0;e<a.b.length;e++)b(a.b[e],c);return new xh(d)}xh.prototype.forEach=function(a){for(var b=[],c=0;c<this.b.length;c++)b.push(a(this.b[c]));return b};function Ph(a,b){for(var c=[],d=0;d<a.b.length;d++){var e=b(a.b[d]);null!=e&&c.push(e)}return c}function wh(a,b){return Oh(a,function(a,d){for(var e=a.firstChild;e;e=e.nextSibling)e.localName==b&&d(e)})}
function Qh(a){return Oh(a,function(a,c){for(var d=a.firstChild;d;d=d.nextSibling)1==d.nodeType&&c(d)})}function Rh(a,b){return Ph(a,function(a){return 1==a.nodeType?a.getAttribute(b):null})}xh.prototype.textContent=function(){return this.forEach(function(a){return a.textContent})};var Sh={transform:!0,"transform-origin":!0},Th={top:!0,bottom:!0,left:!0,right:!0};function Uh(a,b,c){this.target=a;this.name=b;this.value=c}var Vh={show:function(a){a.style.visibility="visible"},hide:function(a){a.style.visibility="hidden"},play:function(a){a.currentTime=0;a.play()},pause:function(a){a.pause()},resume:function(a){a.play()},mute:function(a){a.muted=!0},unmute:function(a){a.muted=!1}};
function Wh(a,b){var c=Vh[b];return c?function(){for(var b=0;b<a.length;b++)try{c(a[b])}catch(e){}}:null}
function Xh(a,b){this.f={};this.M=a;this.d=b;this.w=null;this.h=[];var c=this;this.D=function(a){var b=a.currentTarget,f=b.getAttribute("href")||b.getAttributeNS("http://www.w3.org/1999/xlink","href");f&&$a(c,{type:"hyperlink",target:null,currentTarget:null,Ie:b,href:f,preventDefault:function(){a.preventDefault()}})};this.b={};this.e={width:0,height:0};this.k=this.l=!1;this.H=0;this.position=null;this.offset=-1;this.j=null;this.g=[];this.u={top:{},bottom:{},left:{},right:{}}}t(Xh,Za);
function Yh(a){a.G=!0;a.M.setAttribute("data-vivliostyle-auto-page-width",!0)}function Zh(a){a.F=!0;a.M.setAttribute("data-vivliostyle-auto-page-height",!0)}function $h(a,b,c){var d=a.b[c];d?d.push(b):a.b[c]=[b]}
function ai(a,b){Object.keys(a.b).forEach(function(a){for(var b=this.b[a],c=0;c<b.length;)this.M.contains(b[c])?c++:b.splice(c,1);0===b.length&&delete this.b[a]},a);var c=a.M.getBoundingClientRect();a.e.width=c.width;a.e.height=c.height;for(var d=a.h,c=0;c<d.length;c++){var e=d[c];v(e.target,e.name,e.value.toString())}for(c=0;c<b.length;c++){var d=b[c],f=a.b[d.ec],e=a.b[d.ie];if(f&&e&&(f=Wh(f,d.action)))for(var g=0;g<e.length;g++)e[g].addEventListener(d.event,f,!1)}}
Xh.prototype.zoom=function(a){v(this.M,"transform","scale("+a+")")};Xh.prototype.B=function(){return this.w||this.M};function bi(a){switch(a){case "normal":case "nowrap":return 0;case "pre-line":return 1;case "pre":case "pre-wrap":return 2;default:return null}}function ci(a,b){if(1==a.nodeType)return!1;var c=a.textContent;switch(b){case 0:return!!c.match(/^\s*$/);case 1:return!!c.match(/^[ \t\f]*$/);case 2:return 0==c.length}throw Error("Unexpected whitespace: "+b);}
function di(a){this.d=a;this.b=[]}function ei(a,b,c,d,e,f,g,h,l){this.b=a;this.element=b;this.d=c;this.Ha=d;this.h=e;this.f=f;this.le=g;this.g=h;this.Ua=-1;this.e=l}function fi(a,b){return a.f?!b.f||a.Ha>b.Ha?!0:a.g:!1}function gi(a,b){return a.top-b.top}function ii(a,b){return b.right-a.right}
function ji(a,b){if(a===b)return!0;if(!a||!b||a.ea!==b.ea||a.I!==b.I||a.ha.length!==b.ha.length)return!1;for(var c=0;c<a.ha.length;c++){var d=a[c],e=b[c];if(!(d===e||d&&e&&d.ga===e.ga&&d.Ia===e.Ia&&d.fa===e.fa&&d.ra===e.ra&&d.oa===e.oa))return!1}return!0}function ki(a,b,c,d,e,f,g){this.ba=a;this.ed=d;this.Ed=null;this.root=b;this.aa=c;this.type=f;e&&(e.Ed=this);this.b=g}function li(a,b){this.je=a;this.count=b}
function mi(a,b,c){this.$=a;this.parent=b;this.ja=c;this.ea=0;this.I=!1;this.Ia=0;this.fa=b?b.fa:null;this.oa=this.ra=null;this.O=!1;this.e=!0;this.d=!1;this.j=b?b.j:0;this.l=this.k=this.Y=this.display=null;this.B=!1;this.w=b?b.w:0;this.F=this.G=!1;this.u=this.A=this.D=this.h=null;this.g=b?b.g:{};this.b=b?b.b:!1;this.N=b?b.N:"ltr";this.f=b?b.f:null}
function ni(a){a.e=!0;a.j=a.parent?a.parent.j:0;a.A=null;a.u=null;a.ea=0;a.I=!1;a.display=null;a.k=null;a.l=null;a.B=!1;a.w=a.parent?a.parent.w:0;a.h=null;a.D=null;a.ra=null;a.G=!1;a.F=!1;a.b=a.parent?a.parent.b:!1;a.ra=null}function oi(a){var b=new mi(a.$,a.parent,a.ja);b.ea=a.ea;b.I=a.I;b.ra=a.ra;b.Ia=a.Ia;b.fa=a.fa;b.oa=a.oa;b.e=a.e;b.j=a.j;b.display=a.display;b.k=a.k;b.l=a.l;b.G=a.G;b.F=a.F;b.B=a.B;b.w=a.w;b.h=a.h;b.D=a.D;b.A=a.A;b.u=a.u;b.f=a.f;b.b=a.b;b.d=a.d;return b}
mi.prototype.modify=function(){return this.O?oi(this):this};function pi(a){var b=a;do{if(b.O)break;b.O=!0;b=b.parent}while(b);return a}mi.prototype.clone=function(){for(var a=oi(this),b=a,c;null!=(c=b.parent);)c=oi(c),b=b.parent=c;return a};function qi(a){return{ga:a.$,Ia:a.Ia,fa:a.fa,ra:a.ra,oa:a.oa?qi(a.oa):null}}function ri(a){var b=a,c=[];do b.f&&b.parent&&b.parent.f!==b.f||c.push(qi(b)),b=b.parent;while(b);return{ha:c,ea:a.ea,I:a.I}}
function si(a){for(a=a.parent;a;){if(a.G)return!0;a=a.parent}return!1}function ti(a){for(a=a.parent;a;){if(a.F)return a;a=a.parent}return null}function ui(a,b){for(var c=a;c;){c.e||b(c);if(c.G)break;c=c.parent}}function vi(a){this.Oa=a;this.b=this.d=null}vi.prototype.clone=function(){var a=new vi(this.Oa);if(this.d){a.d=[];for(var b=0;b<this.d.length;++b)a.d[b]=this.d[b]}if(this.b)for(a.b=[],b=0;b<this.b.length;++b)a.b[b]=this.b[b];return a};
function wi(a,b){if(!b)return!1;if(a===b)return!0;if(!ji(a.Oa,b.Oa))return!1;if(a.d){if(!b.d||a.d.length!==b.d.length)return!1;for(var c=0;c<a.d.length;c++)if(!ji(a.d[c],b.d[c]))return!1}else if(b.d)return!1;if(a.b){if(!b.b||a.b.length!==b.b.length)return!1;for(c=0;c<a.b.length;c++)if(!ji(a.b[c],b.b[c]))return!1}else if(b.b)return!1;return!0}function xi(a,b){this.d=a;this.b=b}xi.prototype.clone=function(){return new xi(this.d.clone(),this.b)};function yi(){this.b=[];this.d="any"}
yi.prototype.clone=function(){for(var a=new yi,b=this.b,c=a.b,d=0;d<b.length;d++)c[d]=b[d].clone();a.d=this.d;return a};function zi(a,b){if(a===b)return!0;if(!b||a.b.length!==b.b.length)return!1;for(var c=0;c<a.b.length;c++){var d=a.b[c],e=b.b[c];if(!e||d!==e&&!wi(d.d,e.d))return!1}return!0}function Ai(){this.page=0;this.e={};this.b={};this.d=0}Ai.prototype.clone=function(){var a=new Ai;a.page=this.page;a.f=this.f;a.d=this.d;a.g=this.g;a.e=this.e;for(var b in this.b)a.b[b]=this.b[b].clone();return a};
function Bi(a,b){if(a===b)return!0;if(!b||a.page!==b.page||a.d!==b.d)return!1;var c=Object.keys(a.b),d=Object.keys(b.b);if(c.length!==d.length)return!1;for(d=0;d<c.length;d++){var e=c[d];if(!zi(a.b[e],b.b[e]))return!1}return!0}
function Ci(a){this.element=a;this.D=this.B=this.height=this.width=this.l=this.j=this.u=this.h=this.Aa=this.O=this.Ja=this.N=this.marginBottom=this.marginTop=this.marginRight=this.marginLeft=this.top=this.left=0;this.xb=this.F=null;this.ma=this.yb=this.bb=this.Gb=this.d=0;this.b=!1}function Di(a){return a.marginTop+a.O+a.j}function Ei(a){return a.marginBottom+a.Aa+a.l}function Fi(a){return a.marginLeft+a.N+a.h}function Gi(a){return a.marginRight+a.Ja+a.u}
function Hi(a,b){a.element=b.element;a.left=b.left;a.top=b.top;a.marginLeft=b.marginLeft;a.marginRight=b.marginRight;a.marginTop=b.marginTop;a.marginBottom=b.marginBottom;a.N=b.N;a.Ja=b.Ja;a.O=b.O;a.Aa=b.Aa;a.h=b.h;a.u=b.u;a.j=b.j;a.l=b.l;a.width=b.width;a.height=b.height;a.B=b.B;a.D=b.D;a.xb=b.xb;a.F=b.F;a.d=b.d;a.Gb=b.Gb;a.bb=b.bb;a.b=b.b}function Ii(a,b,c){a.top=b;a.height=c;v(a.element,"top",b+"px");v(a.element,"height",c+"px")}
function Ji(a,b,c){a.left=b;a.width=c;v(a.element,"left",b+"px");v(a.element,"width",c+"px")}function Ki(a,b){this.b=a;this.d=b}t(Ki,cd);Ki.prototype.lc=function(a){this.b.appendChild(this.b.ownerDocument.createTextNode(a.b));return null};Ki.prototype.mc=function(a){var b=this.b.ownerDocument.createElementNS("http://www.w3.org/1999/xhtml","img");b.setAttribute("src",a.url);this.b.appendChild(b);return null};Ki.prototype.hb=function(a){this.vb(a.values);return null};
Ki.prototype.Rb=function(a){a=a.ka().evaluate(this.d);"string"===typeof a&&this.b.appendChild(this.b.ownerDocument.createTextNode(a));return null};function Li(a){return null!=a&&a!==Ud&&a!==J&&a!==Ld};function Mi(a){a=a.toString();switch(a){case "inline-flex":a="flex";break;case "inline-grid":a="grid";break;case "inline-table":a="table";break;case "inline":case "table-row-group":case "table-column":case "table-column-group":case "table-header-group":case "table-footer-group":case "table-row":case "table-cell":case "table-caption":case "inline-block":a="block";break}return G(a)}
function Ni(a,b,c,d){if(a!==J)if(b===td||b===Hd)c=J,a=Mi(a);else if(c&&c!==J||d)a=Mi(a);return{display:a,position:b,b:c}}function Oi(a,b,c,d,e,f){e=e||f||Kd;return!!c&&c!==J||b===td||b===Hd||a===Nd||a===de||a===ce||a==Id||(a===xd||a===Sd)&&!!d&&d!==je||!!f&&e!==f};function Pi(a,b,c){b=b?"vertical-rl":"horizontal-tb";if("top"===a||"bottom"===a)a=ca(a,b,c||null,ia);"block-start"===a&&(a="inline-start");"block-end"===a&&(a="inline-end");if("inline-start"===a||"inline-end"===a){c=ca(a,b,c||null,ha);a:{var d=ja[b];if(!d)throw Error("unknown writing-mode: "+b);for(b=0;b<d.length;b++)if(d[b].K===c){b=d[b].J;break a}b=c}"line-left"===b?a="left":"line-right"===b&&(a="right")}"left"!==a&&"right"!==a&&(u.b("Invalid float value: "+a+". Fallback to left."),a="left");return a}
function Qi(a,b){this.d=pi(a);this.b=b}function Ri(a,b,c){this.e=a;this.g=b;this.f=c;this.d=[];this.b=[]}
function Si(a,b,c){b.parentNode&&b.parentNode.removeChild(b);v(b,"float","none");v(b,"position","absolute");var d=a.g.toString(),e=a.f.toString(),f=ca(c,d,e||null,ha),g=ca(c,d,e||null,ia);v(b,f,"0");switch(g){case "inline-start":case "inline-end":d=ca("block-start",d,e||null,ha);v(b,d,"0");break;case "block-start":case "block-end":c=ca("inline-start",d,e||null,ha);v(b,c,"0");d=ca("max-inline-size",d,e||null,ha);Ia(b,d)||v(b,d,"100%");break;default:throw Error("unknown float direction: "+c);}a.e().appendChild(b)}
function Ti(a,b,c){b=ri(b);for(var d=0;d<a.d.length;d++){var e=a.d[d];if(Ui(c,b,ri(e.d)))return e}return null}function Vi(a,b,c){var d=L("tryToAddFloat");b=new Qi(b,c);a.d.push(b);a.b.push(b);O(d,b);return N(d)}function Wi(a){return a.b.map(function(a){a=a.b;return new xe([new se(a.ca,a.W),new se(a.V,a.W),new se(a.V,a.S),new se(a.ca,a.S)])})};var Xi={SIMPLE_PROPERTY:"SIMPLE_PROPERTY"},Yi={};function Zi(a,b){if(Xi[a]){var c=Yi[a];c||(c=Yi[a]=[]);c.push(b)}else u.b(Error("Skipping unknown plugin hook '"+a+"'."))}ba("vivliostyle.plugin.registerHook",Zi);ba("vivliostyle.plugin.removeHook",function(a,b){if(Xi[a]){var c=Yi[a];if(c){var d=c.indexOf(b);0<=d&&c.splice(d,1)}}else u.b(Error("Ignoring unknown plugin hook '"+a+"'."))});for(var $i={azimuth:!0,"border-collapse":!0,"border-spacing":!0,"caption-side":!0,color:!0,cursor:!0,direction:!0,elevation:!0,"empty-cells":!0,"font-kerning":!0,"font-size":!0,"font-size-adjust":!0,"font-family":!0,"font-feature-settings":!0,"font-style":!0,"font-variant":!0,"font-weight":!0,"image-resolution":!0,"letter-spacing":!0,"line-break":!0,"line-height":!0,"list-style-image":!0,"list-style-position":!0,"list-style-type":!0,orphans:!0,"overflow-wrap":!0,"pitch-range":!0,quotes:!0,richness:!0,
"ruby-align":!0,"ruby-position":!0,"speak-header":!0,"speak-numeral":!0,"speak-punctuation":!0,"speech-rate":!0,stress:!0,"tab-size":!0,"text-align":!0,"text-align-last":!0,"text-decoration-skip":!0,"text-emphasis-color":!0,"text-emphasis-position":!0,"text-emphasis-style":!0,"text-combine-upright":!0,"text-indent":!0,"text-justify":!0,"text-size-adjust":!0,"text-transform":!0,"text-underline-position":!0,visibility:!0,"voice-family":!0,volume:!0,"white-space":!0,widows:!0,"word-break":!0,"word-spacing":!0,
"word-wrap":!0,"writing-mode":!0},aj=["box-decoration-break","image-resolution","orphans","widows"],bj={"http://www.idpf.org/2007/ops":!0,"http://www.w3.org/1999/xhtml":!0,"http://www.w3.org/2000/svg":!0},cj="margin-% padding-% border-%-width border-%-style border-%-color %".split(" "),dj=["left","right","top","bottom"],ej={width:!0,height:!0},fj=0;fj<cj.length;fj++)for(var gj=0;gj<dj.length;gj++){var hj=cj[fj].replace("%",dj[gj]);ej[hj]=!0}
function ij(a){for(var b={},c=0;c<cj.length;c++)for(var d in a){var e=cj[c].replace("%",d),f=cj[c].replace("%",a[d]);b[e]=f;b[f]=e}return b}var jj=ij({before:"right",after:"left",start:"top",end:"bottom"}),kj=ij({before:"top",after:"bottom",start:"left",end:"right"});function U(a,b){this.value=a;this.Ha=b}n=U.prototype;n.Kd=function(){return this};n.tc=function(a){a=this.value.U(a);return a===this.value?this:new U(a,this.Ha)};n.Md=function(a){return 0==a?this:new U(this.value,this.Ha+a)};
n.evaluate=function(a,b){return lg(a,this.value,b)};n.Gd=function(){return!0};function lj(a,b,c){U.call(this,a,b);this.L=c}t(lj,U);lj.prototype.Kd=function(){return new U(this.value,this.Ha)};lj.prototype.tc=function(a){a=this.value.U(a);return a===this.value?this:new lj(a,this.Ha,this.L)};lj.prototype.Md=function(a){return 0==a?this:new lj(this.value,this.Ha+a,this.L)};lj.prototype.Gd=function(a){return!!this.L.evaluate(a)};function mj(a,b,c){return(null==b||c.Ha>b.Ha)&&c.Gd(a)?c.Kd():b}var nj={"region-id":!0};
function oj(a){return"_"!=a.charAt(0)&&!nj[a]}function pj(a,b,c){c?a[b]=c:delete a[b]}function qj(a,b){var c=a[b];c||(c={},a[b]=c);return c}function rj(a,b){var c=a[b];c||(c=[],a[b]=c);return c}function sj(a,b,c,d,e,f){if(e){var g=qj(b,"_pseudos");b=g[e];b||(b={},g[e]=b)}f&&(e=qj(b,"_regions"),b=e[f],b||(b={},e[f]=b));for(var h in c)"_"!=h.charAt(0)&&(nj[h]?(f=c[h],e=rj(b,h),Array.prototype.push.apply(e,f)):pj(b,h,mj(a,b[h],c[h].Md(d))))}
function tj(a,b){if(0<a.length){a.sort(function(a,b){return b.d()-a.d()});for(var c=null,d=a.length-1;0<=d;d--)c=a[d],c.b=b,b=c;return c}return b}function uj(a,b){this.e=a;this.b=b;this.d=""}t(uj,dd);function vj(a){a=a.e["font-size"].value;var b;a:switch(a.X.toLowerCase()){case "px":case "in":case "pt":case "pc":case "cm":case "mm":case "q":b=!0;break a;default:b=!1}if(!b)throw Error("Unexpected state");return a.C*mc[a.X]}
uj.prototype.Ub=function(a){if("em"==a.X||"ex"==a.X){var b=qc(this.b,a.X,!1)/qc(this.b,"em",!1);return new H(a.C*b*vj(this),"px")}if("rem"==a.X||"rex"==a.X)return b=qc(this.b,a.X,!1)/qc(this.b,"rem",!1),new H(a.C*b*this.b.fontSize(),"px");if("%"==a.X){if("font-size"===this.d)return new H(a.C/100*vj(this),"px");b=this.d.match(/height|^(top|bottom)$/)?"vh":"vw";return new H(a.C,b)}return a};uj.prototype.Rb=function(a){return"font-size"==this.d?lg(this.b,a,this.d).U(this):a};function wj(){}
wj.prototype.apply=function(){};wj.prototype.h=function(a){return new xj([this,a])};wj.prototype.clone=function(){return this};function yj(a){this.b=a}t(yj,wj);yj.prototype.apply=function(a){a.g[a.g.length-1].push(this.b.b())};function xj(a){this.b=a}t(xj,wj);xj.prototype.apply=function(a){for(var b=0;b<this.b.length;b++)this.b[b].apply(a)};xj.prototype.h=function(a){this.b.push(a);return this};xj.prototype.clone=function(){return new xj([].concat(this.b))};
function zj(a,b,c,d){this.style=a;this.P=b;this.b=c;this.f=d}t(zj,wj);zj.prototype.apply=function(a){sj(a.h,a.u,this.style,this.P,this.b,this.f)};function V(){this.b=null}t(V,wj);V.prototype.apply=function(a){this.b.apply(a)};V.prototype.d=function(){return 0};V.prototype.e=function(){return!1};function Aj(a){this.b=null;this.f=a}t(Aj,V);Aj.prototype.apply=function(a){0<=a.w.indexOf(this.f)&&this.b.apply(a)};Aj.prototype.d=function(){return 10};
Aj.prototype.e=function(a){this.b&&Bj(a.va,this.f,this.b);return!0};function Cj(a){this.b=null;this.id=a}t(Cj,V);Cj.prototype.apply=function(a){a.N!=this.id&&a.Y!=this.id||this.b.apply(a)};Cj.prototype.d=function(){return 11};Cj.prototype.e=function(a){this.b&&Bj(a.e,this.id,this.b);return!0};function Dj(a){this.b=null;this.localName=a}t(Dj,V);Dj.prototype.apply=function(a){a.d==this.localName&&this.b.apply(a)};Dj.prototype.d=function(){return 8};
Dj.prototype.e=function(a){this.b&&Bj(a.kc,this.localName,this.b);return!0};function Ej(a,b){this.b=null;this.f=a;this.localName=b}t(Ej,V);Ej.prototype.apply=function(a){a.d==this.localName&&a.e==this.f&&this.b.apply(a)};Ej.prototype.d=function(){return 8};Ej.prototype.e=function(a){if(this.b){var b=a.b[this.f];b||(b="ns"+a.g++ +":",a.b[this.f]=b);Bj(a.f,b+this.localName,this.b)}return!0};function Fj(a){this.b=null;this.f=a}t(Fj,V);
Fj.prototype.apply=function(a){var b=a.b;if(b&&"a"==a.d){var c=b.getAttribute("href");c&&c.match(/^#/)&&(b=b.ownerDocument.getElementById(c.substring(1)))&&(b=b.getAttributeNS("http://www.idpf.org/2007/ops","type"))&&b.match(this.f)&&this.b.apply(a)}};function Gj(a){this.b=null;this.f=a}t(Gj,V);Gj.prototype.apply=function(a){a.e==this.f&&this.b.apply(a)};function Hj(a,b){this.b=null;this.f=a;this.name=b}t(Hj,V);Hj.prototype.apply=function(a){a.b&&a.b.hasAttributeNS(this.f,this.name)&&this.b.apply(a)};
function Ij(a,b,c){this.b=null;this.f=a;this.name=b;this.value=c}t(Ij,V);Ij.prototype.apply=function(a){a.b&&a.b.getAttributeNS(this.f,this.name)==this.value&&this.b.apply(a)};Ij.prototype.d=function(){return"type"==this.name&&"http://www.idpf.org/2007/ops"==this.f?9:0};Ij.prototype.e=function(a){return"type"==this.name&&"http://www.idpf.org/2007/ops"==this.f?(this.b&&Bj(a.d,this.value,this.b),!0):!1};function Jj(a,b){this.b=null;this.f=a;this.name=b}t(Jj,V);
Jj.prototype.apply=function(a){if(a.b){var b=a.b.getAttributeNS(this.f,this.name);b&&bj[b]&&this.b.apply(a)}};Jj.prototype.d=function(){return 0};Jj.prototype.e=function(){return!1};function Kj(a,b,c){this.b=null;this.g=a;this.name=b;this.f=c}t(Kj,V);Kj.prototype.apply=function(a){if(a.b){var b=a.b.getAttributeNS(this.g,this.name);b&&b.match(this.f)&&this.b.apply(a)}};function Lj(a){this.b=null;this.f=a}t(Lj,V);Lj.prototype.apply=function(a){a.lang.match(this.f)&&this.b.apply(a)};
function Mj(){this.b=null}t(Mj,V);Mj.prototype.apply=function(a){a.Ja&&this.b.apply(a)};Mj.prototype.d=function(){return 6};function Nj(){this.b=null}t(Nj,V);Nj.prototype.apply=function(a){a.ma&&this.b.apply(a)};Nj.prototype.d=function(){return 12};function Oj(a,b){this.b=null;this.f=a;this.Vb=b}t(Oj,V);function Pj(a,b){var c=a.f;b-=a.Vb;return 0===c?0===b:0===b%c&&0<=b/c}function Qj(a,b){Oj.call(this,a,b)}t(Qj,Oj);Qj.prototype.apply=function(a){Pj(this,a.Aa)&&this.b.apply(a)};Qj.prototype.d=function(){return 5};
function Rj(a,b){Oj.call(this,a,b)}t(Rj,Oj);Rj.prototype.apply=function(a){Pj(this,a.bb[a.e][a.d])&&this.b.apply(a)};Rj.prototype.d=function(){return 5};function Sj(a,b){Oj.call(this,a,b)}t(Sj,Oj);Sj.prototype.apply=function(a){var b=a.G;null===b&&(b=a.G=a.b.parentNode.childElementCount-a.Aa+1);Pj(this,b)&&this.b.apply(a)};Sj.prototype.d=function(){return 4};function Tj(a,b){Oj.call(this,a,b)}t(Tj,Oj);
Tj.prototype.apply=function(a){var b=a.ab;if(!b[a.e]){var c=a.b;do{var d=c.namespaceURI,e=c.localName,f=b[d];f||(f=b[d]={});f[e]=(f[e]||0)+1}while(c=c.nextElementSibling)}Pj(this,b[a.e][a.d])&&this.b.apply(a)};Tj.prototype.d=function(){return 4};function Uj(){this.b=null}t(Uj,V);Uj.prototype.apply=function(a){for(var b=a.b.firstChild;b;){switch(b.nodeType){case Node.ELEMENT_NODE:return;case Node.TEXT_NODE:if(0<b.length)return}b=b.nextSibling}this.b.apply(a)};Uj.prototype.d=function(){return 4};
function Vj(){this.b=null}t(Vj,V);Vj.prototype.apply=function(a){!1===a.b.disabled&&this.b.apply(a)};Vj.prototype.d=function(){return 5};function Wj(){this.b=null}t(Wj,V);Wj.prototype.apply=function(a){!0===a.b.disabled&&this.b.apply(a)};Wj.prototype.d=function(){return 5};function Xj(){this.b=null}t(Xj,V);Xj.prototype.apply=function(a){var b=a.b;!0!==b.selected&&!0!==b.checked||this.b.apply(a)};Xj.prototype.d=function(){return 5};function Yj(a){this.b=null;this.L=a}t(Yj,V);
Yj.prototype.apply=function(a){a.j[this.L]&&this.b.apply(a)};Yj.prototype.d=function(){return 5};function Zj(){this.b=!1}t(Zj,wj);Zj.prototype.apply=function(){this.b=!0};Zj.prototype.clone=function(){var a=new Zj;a.b=this.b;return a};function ak(a){this.b=null;this.f=new Zj;this.g=tj(a,this.f)}t(ak,V);ak.prototype.apply=function(a){this.g.apply(a);this.f.b||this.b.apply(a);this.f.b=!1};ak.prototype.d=function(){return this.g.d()};function bk(a){this.L=a}bk.prototype.b=function(){return this};
bk.prototype.push=function(a,b){0==b&&ck(a,this.L);return!1};bk.prototype.pop=function(a,b){return 0==b?(a.j[this.L]--,!0):!1};function dk(a){this.L=a}dk.prototype.b=function(){return this};dk.prototype.push=function(a,b){0==b?ck(a,this.L):1==b&&a.j[this.L]--;return!1};dk.prototype.pop=function(a,b){if(0==b)return a.j[this.L]--,!0;1==b&&ck(a,this.L);return!1};function ek(a){this.L=a;this.d=!1}ek.prototype.b=function(){return new ek(this.L)};
ek.prototype.push=function(a){return this.d?(a.j[this.L]--,!0):!1};ek.prototype.pop=function(a,b){if(this.d)return a.j[this.L]--,!0;0==b&&(this.d=!0,ck(a,this.L));return!1};function fk(a){this.L=a;this.d=!1}fk.prototype.b=function(){return new fk(this.L)};fk.prototype.push=function(a,b){this.d&&(-1==b?ck(a,this.L):0==b&&a.j[this.L]--);return!1};fk.prototype.pop=function(a,b){if(this.d){if(-1==b)return a.j[this.L]--,!0;0==b&&ck(a,this.L)}else 0==b&&(this.d=!0,ck(a,this.L));return!1};
function gk(a,b){this.d=a;this.element=b}gk.prototype.b=function(){return this};gk.prototype.push=function(){return!1};gk.prototype.pop=function(a,b){return 0==b?(hk(a,this.d,this.element),!0):!1};function ik(a){this.lang=a}ik.prototype.b=function(){return this};ik.prototype.push=function(){return!1};ik.prototype.pop=function(a,b){return 0==b?(a.lang=this.lang,!0):!1};function jk(a){this.d=a}jk.prototype.b=function(){return this};jk.prototype.push=function(){return!1};
jk.prototype.pop=function(a,b){return 0==b?(a.D=this.d,!0):!1};function kk(a){this.element=a}t(kk,dd);function lk(a,b){switch(b){case "url":return a?new qd(a):new qd("about:invalid");default:return a?new ld(a):new ld("")}}
kk.prototype.kb=function(a){if("attr"!==a.name)return dd.prototype.kb.call(this,a);var b="string",c=null,d=null;a.values[0]instanceof ed?(2<=a.values[0].values.length&&(b=a.values[0].values[1].stringValue()),c=a.values[0].values[0].stringValue()):c=a.values[0].stringValue();d=1<a.values.length?lk(a.values[1].stringValue(),b):lk(null,b);return this.element&&this.element.hasAttribute(c)?lk(this.element.getAttribute(c),b):d};function mk(a,b,c){this.d=a;this.element=b;this.b=c}t(mk,dd);
mk.prototype.ub=function(a){var b=this.d,c=b.D,d=Math.floor(c.length/2)-1;switch(a.name){case "open-quote":a=c[2*Math.min(d,b.l)];b.l++;break;case "close-quote":return 0<b.l&&b.l--,c[2*Math.min(d,b.l)+1];case "no-open-quote":return b.l++,new ld("");case "no-close-quote":return 0<b.l&&b.l--,new ld("")}return a};
var nk={roman:[4999,1E3,"M",900,"CM",500,"D",400,"CD",100,"C",90,"XC",50,"L",40,"XL",10,"X",9,"IX",5,"V",4,"IV",1,"I"],armenian:[9999,9E3,"\u0584",8E3,"\u0583",7E3,"\u0582",6E3,"\u0581",5E3,"\u0580",4E3,"\u057f",3E3,"\u057e",2E3,"\u057d",1E3,"\u057c",900,"\u057b",800,"\u057a",700,"\u0579",600,"\u0578",500,"\u0577",400,"\u0576",300,"\u0575",200,"\u0574",100,"\u0573",90,"\u0572",80,"\u0571",70,"\u0570",60,"\u056f",50,"\u056e",40,"\u056d",30,"\u056c",20,"\u056b",10,"\u056a",9,"\u0569",8,"\u0568",7,"\u0567",
6,"\u0566",5,"\u0565",4,"\u0564",3,"\u0563",2,"\u0562",1,"\u0561"],georgian:[19999,1E4,"\u10f5",9E3,"\u10f0",8E3,"\u10ef",7E3,"\u10f4",6E3,"\u10ee",5E3,"\u10ed",4E3,"\u10ec",3E3,"\u10eb",2E3,"\u10ea",1E3,"\u10e9",900,"\u10e8",800,"\u10e7",700,"\u10e6",600,"\u10e5",500,"\u10e4",400,"\u10f3",300,"\u10e2",200,"\u10e1",100,"\u10e0",90,"\u10df",80,"\u10de",70,"\u10dd",60,"\u10f2",50,"\u10dc",40,"\u10db",30,"\u10da",20,"\u10d9",10,"\u10d8",9,"\u10d7",8,"\u10f1",7,"\u10d6",6,"\u10d5",5,"\u10d4",4,"\u10d3",
3,"\u10d2",2,"\u10d1",1,"\u10d0"],hebrew:[999,400,"\u05ea",300,"\u05e9",200,"\u05e8",100,"\u05e7",90,"\u05e6",80,"\u05e4",70,"\u05e2",60,"\u05e1",50,"\u05e0",40,"\u05de",30,"\u05dc",20,"\u05db",19,"\u05d9\u05d8",18,"\u05d9\u05d7",17,"\u05d9\u05d6",16,"\u05d8\u05d6",15,"\u05d8\u05d5",10,"\u05d9",9,"\u05d8",8,"\u05d7",7,"\u05d6",6,"\u05d5",5,"\u05d4",4,"\u05d3",3,"\u05d2",2,"\u05d1",1,"\u05d0"]},ok={latin:"a-z",alpha:"a-z",greek:"\u03b1-\u03c1\u03c3-\u03c9",russian:"\u0430-\u0438\u043a-\u0449\u044d-\u044f"},
pk={square:"\u25a0",disc:"\u2022",circle:"\u25e6",none:""},qk={Ke:!1,Wb:"\u96f6\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d",wc:"\u5341\u767e\u5343",ge:"\u8ca0"};
function rk(a){if(9999<a||-9999>a)return""+a;if(0==a)return qk.Wb.charAt(0);var b=new Ja;0>a&&(b.append(qk.ge),a=-a);if(10>a)b.append(qk.Wb.charAt(a));else if(qk.Le&&19>=a)b.append(qk.wc.charAt(0)),0!=a&&b.append(qk.wc.charAt(a-10));else{var c=Math.floor(a/1E3);c&&(b.append(qk.Wb.charAt(c)),b.append(qk.wc.charAt(2)));if(c=Math.floor(a/100)%10)b.append(qk.Wb.charAt(c)),b.append(qk.wc.charAt(1));if(c=Math.floor(a/10)%10)b.append(qk.Wb.charAt(c)),b.append(qk.wc.charAt(0));(a%=10)&&b.append(qk.Wb.charAt(a))}return b.toString()}
function sk(a,b){var c=!1,d=!1,e;null!=(e=b.match(/^upper-(.*)/))?(c=!0,b=e[1]):null!=(e=b.match(/^lower-(.*)/))&&(d=!0,b=e[1]);e="";if(nk[b])a:{e=nk[b];var f=a;if(f>e[0]||0>=f||f!=Math.round(f))e="";else{for(var g="",h=1;h<e.length;h+=2){var l=e[h],k=Math.floor(f/l);if(20<k){e="";break a}for(f-=k*l;0<k;)g+=e[h+1],k--}e=g}}else if(ok[b])if(e=a,0>=e||e!=Math.round(e))e="";else{g=ok[b];f=[];for(h=0;h<g.length;)if("-"==g.substr(h+1,1))for(k=g.charCodeAt(h),l=g.charCodeAt(h+2),h+=3;k<=l;k++)f.push(String.fromCharCode(k));
else f.push(g.substr(h++,1));g="";do e--,h=e%f.length,g=f[h]+g,e=(e-h)/f.length;while(0<e);e=g}else null!=pk[b]?e=pk[b]:"decimal-leading-zero"==b?(e=a+"",1==e.length&&(e="0"+e)):"cjk-ideographic"==b||"trad-chinese-informal"==b?e=rk(a):e=a+"";return c?e.toUpperCase():d?e.toLowerCase():e}
function tk(a,b){var c=b[0].toString(),d=1<b.length?b[1].stringValue():"decimal",e=a.d.f[c];if(e&&e.length)return new ld(sk(e&&e.length&&e[e.length-1]||0,d));c=new I(uk(a.b,c,function(a){return sk(a||0,d)}));return new ed([c])}
function vk(a,b){var c=b[0].toString(),d=b[1].stringValue(),e=2<b.length?b[2].stringValue():"decimal",f=a.d.f[c],g=new Ja;if(f&&f.length)for(var h=0;h<f.length;h++)0<h&&g.append(d),g.append(sk(f[h],e));c=new I(wk(a.b,c,function(a){var b=[];if(a.length)for(var c=0;c<a.length;c++)b.push(sk(a[c],e));a=g.toString();a.length&&b.push(a);return b.length?b.join(d):sk(0,e)}));return new ed([c])}
function xk(a,b){var c=b[0],c=c instanceof qd?c.url:c.stringValue(),d=b[1].toString(),e=2<b.length?b[2].stringValue():"decimal",c=new I(yk(a.b,c,d,function(a){return sk(a||0,e)}));return new ed([c])}function zk(a,b){var c=b[0],c=c instanceof qd?c.url:c.stringValue(),d=b[1].toString(),e=b[2].stringValue(),f=3<b.length?b[3].stringValue():"decimal",c=new I(Ak(a.b,c,d,function(a){a=a.map(function(a){return sk(a,f)});return a.length?a.join(e):sk(0,f)}));return new ed([c])}
mk.prototype.kb=function(a){switch(a.name){case "counter":if(2>=a.values.length)return tk(this,a.values);break;case "counters":if(3>=a.values.length)return vk(this,a.values);break;case "target-counter":if(3>=a.values.length)return xk(this,a.values);break;case "target-counters":if(4>=a.values.length)return zk(this,a.values)}u.b("E_CSS_CONTENT_PROP:",a.toString());return new ld("")};var Bk=1/1048576;function Ck(a,b){for(var c in a)b[c]=a[c].clone()}
function Dk(){this.g=0;this.b={};this.kc={};this.f={};this.d={};this.va={};this.e={};this.bc={};this.Q=0}Dk.prototype.clone=function(){var a=new Dk;a.g=this.g;for(var b in this.b)a.b[b]=this.b[b];Ck(this.kc,a.kc);Ck(this.f,a.f);Ck(this.d,a.d);Ck(this.va,a.va);Ck(this.e,a.e);Ck(this.bc,a.bc);a.Q=this.Q;return a};function Bj(a,b,c){var d=a[b];d&&(c=d.h(c));a[b]=c}
function Ek(a,b,c,d){this.k=a;this.h=b;this.Gb=c;this.Pa=d;this.g=[[],[]];this.j={};this.w=this.u=this.b=null;this.qa=this.Y=this.N=this.e=this.d="";this.O=this.F=null;this.ma=this.Ja=!0;this.f={};this.B=[{}];this.D=[new ld("\u201c"),new ld("\u201d"),new ld("\u2018"),new ld("\u2019")];this.l=0;this.lang="";this.yb=[0];this.Aa=0;this.ia=[{}];this.bb=this.ia[0];this.G=null;this.wb=[this.G];this.xb=[{}];this.ab=this.ia[0];this.ib=[]}function ck(a,b){a.j[b]=(a.j[b]||0)+1}
function Fk(a,b,c){(b=b[c])&&b.apply(a)}var Gk=[];function Hk(a,b,c,d){a.b=null;a.u=d;a.e="";a.d="";a.N="";a.Y="";a.w=b;a.qa="";a.F=Gk;a.O=c;Ik(a)}function Jk(a,b,c){a.f[b]?a.f[b].push(c):a.f[b]=[c];c=a.B[a.B.length-1];c||(c={},a.B[a.B.length-1]=c);c[b]=!0}
function Kk(a,b){var c=Md,d=b.display;d&&(c=d.evaluate(a.h));var e=null,f=d=null,g=b["counter-reset"];g&&(g=g.evaluate(a.h))&&(e=sg(g,!0));(g=b["counter-set"])&&(g=g.evaluate(a.h))&&(f=sg(g,!1));(g=b["counter-increment"])&&(g=g.evaluate(a.h))&&(d=sg(g,!1));"ol"!=a.d&&"ul"!=a.d||"http://www.w3.org/1999/xhtml"!=a.e||(e||(e={}),e["ua-list-item"]=0);c===Sd&&(d||(d={}),d["ua-list-item"]=1);if(e)for(var h in e)Jk(a,h,e[h]);if(f)for(var l in f)a.f[l]?(h=a.f[l],h[h.length-1]=f[l]):Jk(a,l,f[l]);if(d)for(var k in d)a.f[k]||
Jk(a,k,0),h=a.f[k],h[h.length-1]+=d[k];c===Sd&&(c=a.f["ua-list-item"],b["ua-list-item-count"]=new U(new nd(c[c.length-1]),0));a.B.push(null)}function Lk(a){var b=a.B.pop();if(b)for(var c in b)(b=a.f[c])&&(1==b.length?delete a.f[c]:b.pop())}function hk(a,b,c){Kk(a,b);b.content&&(b.content=b.content.tc(new mk(a,c,a.Pa)));Lk(a)}var Mk="before transclusion-before footnote-call footnote-marker inner first-letter first-line  transclusion-after after".split(" ");
function Nk(a,b,c){a.ib.push(b);a.O=null;a.b=b;a.u=c;a.e=b.namespaceURI;a.d=b.localName;var d=a.k.b[a.e];a.qa=d?d+a.d:"";a.N=b.getAttribute("id");a.Y=b.getAttributeNS("http://www.w3.org/XML/1998/namespace","id");(d=b.getAttribute("class"))?a.w=d.split(/\s+/):a.w=Gk;(d=b.getAttributeNS("http://www.idpf.org/2007/ops","type"))?a.F=d.split(/\s+/):a.F=Gk;"style"==a.d&&"http://www.gribuser.ru/xml/fictionbook/2.0"==a.e&&(a.w=[b.getAttribute("name")||""]);(d=b.getAttributeNS("http://www.w3.org/XML/1998/namespace",
"lang"))||"http://www.w3.org/1999/xhtml"!=a.e||(d=b.getAttribute("lang"));d&&(a.g[a.g.length-1].push(new ik(a.lang)),a.lang=d.toLowerCase());var d=a.ma,e=a.yb;a.Aa=++e[e.length-1];e.push(0);var e=a.ia,f=a.bb=e[e.length-1],g=f[a.e];g||(g=f[a.e]={});g[a.d]=(g[a.d]||0)+1;e.push({});e=a.wb;null!==e[e.length-1]?a.G=--e[e.length-1]:a.G=null;e.push(null);e=a.xb;(f=a.ab=e[e.length-1])&&f[a.e]&&f[a.e][a.d]--;e.push({});Ik(a);Ok(a,b);e=c.quotes;c=null;e&&(e=e.evaluate(a.h))&&(c=new jk(a.D),e===J?a.D=[new ld(""),
new ld("")]:e instanceof ed&&(a.D=e.values));Kk(a,a.u);e=a.N||a.Y||b.getAttribute("name")||"";if(d||e){var h={};Object.keys(a.f).forEach(function(a){h[a]=Array.b(this.f[a])},a);Pk(a.Gb,e,h)}if(d=a.u._pseudos)for(e=!0,f=0;f<Mk.length;f++)(g=Mk[f])||(e=!1),(g=d[g])&&(e?hk(a,g,b):a.g[a.g.length-2].push(new gk(g,b)));c&&a.g[a.g.length-2].push(c)}function Qk(a,b){for(var c in b)oj(c)&&(b[c]=b[c].tc(a))}function Ok(a,b){var c=new kk(b),d=a.u,e=d._pseudos,f;for(f in e)Qk(c,e[f]);Qk(c,d)}
function Ik(a){var b;for(b=0;b<a.w.length;b++)Fk(a,a.k.va,a.w[b]);for(b=0;b<a.F.length;b++)Fk(a,a.k.d,a.F[b]);Fk(a,a.k.e,a.N);Fk(a,a.k.kc,a.d);""!=a.d&&Fk(a,a.k.kc,"*");Fk(a,a.k.f,a.qa);null!==a.O&&(Fk(a,a.k.bc,a.O),Fk(a,a.k.bc,"*"));a.b=null;a.g.push([]);for(var c=1;-1<=c;--c){var d=a.g[a.g.length-c-2];for(b=0;b<d.length;)d[b].push(a,c)?d.splice(b,1):b++}a.Ja=!0;a.ma=!1}
Ek.prototype.pop=function(){for(var a=1;-1<=a;--a)for(var b=this.g[this.g.length-a-2],c=0;c<b.length;)b[c].pop(this,a)?b.splice(c,1):c++;this.g.pop();this.Ja=!1};var Rk=null;function Sk(a,b,c,d,e,f,g){Gf.call(this,a,b,g);this.b=null;this.P=0;this.f=this.h=null;this.l=!1;this.L=c;this.g=d?d.g:Rk?Rk.clone():new Dk;this.w=e;this.k=f;this.j=0}t(Sk,Hf);Sk.prototype.Nd=function(a){Bj(this.g.kc,"*",a)};function Tk(a,b){var c=tj(a.b,b);c!==b&&c.e(a.g)||a.Nd(c)}
Sk.prototype.jb=function(a,b){if(b||a)this.P+=1,b&&a?this.b.push(new Ej(a,b.toLowerCase())):b?this.b.push(new Dj(b.toLowerCase())):this.b.push(new Gj(a))};Sk.prototype.Pc=function(a){this.f?(u.b("::"+this.f,"followed by ."+a),this.b.push(new Yj(""))):(this.P+=256,this.b.push(new Aj(a)))};var Uk={"nth-child":Qj,"nth-of-type":Rj,"nth-last-child":Sj,"nth-last-of-type":Tj};
Sk.prototype.cc=function(a,b){if(this.f)u.b("::"+this.f,"followed by :"+a),this.b.push(new Yj(""));else{switch(a.toLowerCase()){case "enabled":this.b.push(new Vj);break;case "disabled":this.b.push(new Wj);break;case "checked":this.b.push(new Xj);break;case "root":this.b.push(new Nj);break;case "link":this.b.push(new Dj("a"));this.b.push(new Hj("","href"));break;case "-adapt-href-epub-type":case "href-epub-type":if(b&&1==b.length&&"string"==typeof b[0]){var c=new RegExp("(^|s)"+za(b[0])+"($|s)");this.b.push(new Fj(c))}else this.b.push(new Yj(""));
break;case "-adapt-footnote-content":case "footnote-content":this.l=!0;break;case "visited":case "active":case "hover":case "focus":this.b.push(new Yj(""));break;case "lang":b&&1==b.length&&"string"==typeof b[0]?this.b.push(new Lj(new RegExp("^"+za(b[0].toLowerCase())+"($|-)"))):this.b.push(new Yj(""));break;case "nth-child":case "nth-last-child":case "nth-of-type":case "nth-last-of-type":c=Uk[a.toLowerCase()];b&&2==b.length?this.b.push(new c(b[0],b[1])):this.b.push(new Yj(""));break;case "first-child":this.b.push(new Mj);
break;case "last-child":this.b.push(new Sj(0,1));break;case "first-of-type":this.b.push(new Rj(0,1));break;case "last-of-type":this.b.push(new Tj(0,1));break;case "only-child":this.b.push(new Mj);this.b.push(new Sj(0,1));break;case "only-of-type":this.b.push(new Rj(0,1));this.b.push(new Tj(0,1));break;case "empty":this.b.push(new Uj);break;case "before":case "after":case "first-line":case "first-letter":this.dc(a,b);return;default:u.b("unknown pseudo-class selector: "+a),this.b.push(new Yj(""))}this.P+=
256}};
Sk.prototype.dc=function(a,b){switch(a){case "before":case "after":case "first-line":case "first-letter":case "footnote-call":case "footnote-marker":case "inner":this.f?(u.b("Double pseudoelement ::"+this.f+"::"+a),this.b.push(new Yj(""))):this.f=a;break;case "first-n-lines":if(b&&1==b.length&&"number"==typeof b[0]){var c=Math.round(b[0]);if(0<c&&c==b[0]){this.f?(u.b("Double pseudoelement ::"+this.f+"::"+a),this.b.push(new Yj(""))):this.f="first-"+c+"-lines";break}}default:u.b("Unrecognized pseudoelement: ::"+a),
this.b.push(new Yj(""))}this.P+=1};Sk.prototype.Vc=function(a){this.P+=65536;this.b.push(new Cj(a))};
Sk.prototype.qc=function(a,b,c,d){this.P+=256;b=b.toLowerCase();d=d||"";var e;switch(c){case 0:e=new Hj(a,b);break;case 39:e=new Ij(a,b,d);break;case 45:!d||d.match(/\s/)?e=new Yj(""):e=new Kj(a,b,new RegExp("(^|\\s)"+za(d)+"($|\\s)"));break;case 44:e=new Kj(a,b,new RegExp("^"+za(d)+"($|-)"));break;case 43:d?e=new Kj(a,b,new RegExp("^"+za(d))):e=new Yj("");break;case 42:d?e=new Kj(a,b,new RegExp(za(d)+"$")):e=new Yj("");break;case 46:d?e=new Kj(a,b,new RegExp(za(d))):e=new Yj("");break;case 50:"supported"==
d?e=new Jj(a,b):(u.b("Unsupported :: attr selector op:",d),e=new Yj(""));break;default:u.b("Unsupported attr selector:",c),e=new Yj("")}this.b.push(e)};var Vk=0;n=Sk.prototype;n.mb=function(){var a="d"+Vk++;Tk(this,new yj(new bk(a)));this.b=[new Yj(a)]};n.Oc=function(){var a="c"+Vk++;Tk(this,new yj(new dk(a)));this.b=[new Yj(a)]};n.Nc=function(){var a="a"+Vk++;Tk(this,new yj(new ek(a)));this.b=[new Yj(a)]};n.Sc=function(){var a="f"+Vk++;Tk(this,new yj(new fk(a)));this.b=[new Yj(a)]};
n.Lb=function(){Wk(this);this.f=null;this.l=!1;this.P=0;this.b=[]};n.gb=function(){var a;0!=this.j?(Jf(this,"E_CSS_UNEXPECTED_SELECTOR"),a=!0):a=!1;a||(this.j=1,this.h={},this.f=null,this.P=0,this.l=!1,this.b=[])};n.error=function(a,b){Hf.prototype.error.call(this,a,b);1==this.j&&(this.j=0)};n.Pb=function(a){Hf.prototype.Pb.call(this,a);this.j=0};n.pa=function(){Wk(this);Hf.prototype.pa.call(this);1==this.j&&(this.j=0)};n.nb=function(){Hf.prototype.nb.call(this)};
function Wk(a){if(a.b){var b=a.P,c;c=a.g;c=c.Q+=Bk;Tk(a,a.Pd(b+c));a.b=null;a.f=null;a.l=!1;a.P=0}}n.Pd=function(a){var b=this.w;this.l&&(b=b?"xxx-bogus-xxx":"footnote");return new zj(this.h,a,this.f,b)};n.eb=function(a,b,c){gh(this.k,a,b,c,this)};n.Zb=function(a,b){If(this,"E_INVALID_PROPERTY_VALUE "+a+": "+b.toString())};n.Hc=function(a,b){If(this,"E_INVALID_PROPERTY "+a+": "+b.toString())};
n.fb=function(a,b,c){"display"!=a||b!==Wd&&b!==Vd||(this.fb("flow-options",new ed([Fd,ae]),c),this.fb("flow-into",b,c),b=xd);(Yi.SIMPLE_PROPERTY||[]).forEach(function(d){d=d({name:a,value:b,important:c});a=d.name;b=d.value;c=d.important});var d=c?Cf(this):Df(this);pj(this.h,a,this.L?new lj(b,d,this.L):new U(b,d))};n.hc=function(a){switch(a){case "not":a=new Xk(this),a.gb(),Ff(this.ba,a)}};function Xk(a){Sk.call(this,a.d,a.ba,a.L,a,a.w,a.k,!1);this.parent=a;this.e=a.b}t(Xk,Sk);n=Xk.prototype;
n.hc=function(a){"not"==a&&Jf(this,"E_CSS_UNEXPECTED_NOT")};n.pa=function(){Jf(this,"E_CSS_UNEXPECTED_RULE_BODY")};n.Lb=function(){Jf(this,"E_CSS_UNEXPECTED_NEXT_SELECTOR")};n.rc=function(){this.b&&0<this.b.length&&this.e.push(new ak(this.b));this.parent.P+=this.P;var a=this.ba;a.b=a.e.pop()};n.error=function(a,b){Sk.prototype.error.call(this,a,b);var c=this.ba;c.b=c.e.pop()};function Yk(a,b){Gf.call(this,a,b,!1)}t(Yk,Hf);
Yk.prototype.eb=function(a,b){if(this.d.values[a])this.error("E_CSS_NAME_REDEFINED "+a,this.Yb());else{var c=a.match(/height|^(top|bottom)$/)?"vh":"vw",c=new Sc(this.d,100,c),c=b.ka(this.d,c);this.d.values[a]=c}};function Zk(a,b,c,d,e){Gf.call(this,a,b,!1);this.b=d;this.L=c;this.e=e}t(Zk,Hf);Zk.prototype.eb=function(a,b,c){c?u.b("E_IMPORTANT_NOT_ALLOWED"):gh(this.e,a,b,c,this)};Zk.prototype.Zb=function(a,b){u.b("E_INVALID_PROPERTY_VALUE",a+":",b.toString())};
Zk.prototype.Hc=function(a,b){u.b("E_INVALID_PROPERTY",a+":",b.toString())};Zk.prototype.fb=function(a,b,c){c=c?Cf(this):Df(this);c+=this.Q;this.Q+=Bk;pj(this.b,a,this.L?new lj(b,c,this.L):new U(b,c))};function $k(a,b){eg.call(this,a);this.b={};this.e=b;this.Q=0}t($k,eg);$k.prototype.eb=function(a,b,c){gh(this.e,a,b,c,this)};$k.prototype.Zb=function(a,b){u.b("E_INVALID_PROPERTY_VALUE",a+":",b.toString())};$k.prototype.Hc=function(a,b){u.b("E_INVALID_PROPERTY",a+":",b.toString())};
$k.prototype.fb=function(a,b,c){c=(c?67108864:50331648)+this.Q;this.Q+=Bk;pj(this.b,a,new U(b,c))};function al(a,b,c){return(a=a["writing-mode"])&&(b=a.evaluate(b,"writing-mode"))&&b!==Ld?b===ie:c}function bl(a,b,c,d){var e={},f;for(f in a)oj(f)&&(e[f]=a[f]);a=a._regions;if((c||d)&&a)for(d&&(d=["footnote"],c=c?c.concat(d):d),d=0;d<c.length;d++){f=a[c[d]];for(var g in f)oj(g)&&(e[g]=mj(b,e[g],f[g]))}return e}
function cl(a,b,c,d){c=c?jj:kj;for(var e in a)if(a.hasOwnProperty(e)){var f=a[e];if(f){var g=c[e];if(g){var h=a[g];if(h&&h.Ha>f.Ha)continue;g=ej[g]?g:e}else g=e;b[g]=d(e,f)}}};function dl(a,b,c){this.e=a;this.d=b;this.b=c}function el(){this.map=[]}function fl(a){return 0==a.map.length?0:a.map[a.map.length-1].b}function gl(a,b){if(0==a.map.length)a.map.push(new dl(b,b,b));else{var c=a.map[a.map.length-1],d=c.b+b-c.d;c.d==c.e?(c.d=b,c.e=b,c.b=d):a.map.push(new dl(b,b,d))}}function hl(a,b){0==a.map.length?a.map.push(new dl(b,0,0)):a.map[a.map.length-1].d=b}function il(a,b){var c=Sa(a.map.length,function(c){return b<=a.map[c].d}),c=a.map[c];return c.b-Math.max(0,c.e-b)}
function jl(a,b){var c=Sa(a.map.length,function(c){return b<=a.map[c].b}),c=a.map[c];return c.e-(c.b-b)}function kl(a,b,c,d,e,f,g,h){this.l=a;this.style=b;this.offset=c;this.u=d;this.g=e;this.b=e.b;this.Ea=f;this.Ka=g;this.w=h;this.h=this.j=null;this.k={};this.e=this.d=this.f=null;ll(this)&&(b=b._pseudos)&&b.before&&(a=new kl(a,b.before,c,!1,e,ml(this),g,!0),c=nl(a,"content"),Li(c)&&(this.f=a,this.e=a.e));this.e=ol(pl(this,"before"),this.e);this.Ka&&ql[this.e]&&(e.e=ol(e.e,this.e))}
function nl(a,b,c){if(!(b in a.k)){var d=a.style[b];a.k[b]=d?d.evaluate(a.l,b):c||null}return a.k[b]}function rl(a){return nl(a,"display",Md)}function ml(a){if(null===a.j){var b=rl(a),c=nl(a,"position"),d=nl(a,"float");a.j=Ni(b,c,d,a.u).display===xd}return a.j}function ll(a){null===a.h&&(a.h=a.w&&rl(a)!==J);return a.h}function pl(a,b){var c=null;if(ml(a)){var d=nl(a,"break-"+b);d&&(c=d.toString())}return c}function sl(a){this.e=a;this.b=[];this.Ka=this.Ea=!0;this.d=[]}
function tl(a){return a.b[a.b.length-1]}function ul(a){return a.b.every(function(a){return rl(a)!==J})}sl.prototype.push=function(a,b,c,d){var e=tl(this);d&&e&&d.b!==e.b&&this.d.push({Ea:this.Ea,Ka:this.Ka});e=d||e.g;d=this.Ka||!!d;var f=ul(this);a=new kl(this.e,a,b,c,e,d||this.Ea,d,f);this.b.push(a);this.Ea=ll(a)?!a.f&&ml(a):this.Ea;this.Ka=ll(a)?!a.f&&d:this.Ka;return a};
sl.prototype.pop=function(a){var b=this.b.pop(),c=this.Ea,d=this.Ka;if(ll(b)){var e=b.style._pseudos;e&&e.after&&(a=new kl(b.l,e.after,a,!1,b.g,c,d,!0),c=nl(a,"content"),Li(c)&&(b.d=a))}this.Ka&&b.d&&(a=pl(b.d,"before"),b.g.e=ol(b.g.e,a));if(a=tl(this))a.b===b.b?ll(b)&&(this.Ea=this.Ka=!1):(a=this.d.pop(),this.Ea=a.Ea,this.Ka=a.Ka);return b};
function vl(a,b){if(!b.Ea)return b.offset;var c=a.b.length-1,d=a.b[c];d===b&&(c--,d=a.b[c]);for(;0<=c;){if(d.b!==b.b)return b.offset;if(!d.Ea||d.u)return d.offset;b=d;d=a.b[--c]}throw Error("No block start offset found!");}
function wl(a,b,c,d,e,f,g,h){this.aa=a;this.root=a.root;this.Aa=c;this.f=d;this.j=f;this.d=this.root;this.F={};this.G={};this.l={};this.w=[];this.k=this.D=this.B=null;this.N=new Ek(b,d,g,h);this.e=new el;this.Oa=!0;this.Y=[];this.qa=e;this.ma=this.ia=!1;this.b=a=yh(a,this.root);this.O={};this.g=new sl(d);gl(this.e,a);d=xl(this,this.root);Nk(this.N,this.root,d);yl(this,d,!1);this.u=!0;switch(this.root.namespaceURI){case "http://www.w3.org/1999/xhtml":case "http://www.gribuser.ru/xml/fictionbook/2.0":this.u=
!1}this.Y.push(!0);this.G={};this.G["e"+a]=d;this.b++;zl(this,-1)}function Al(a,b,c,d){return(b=b[d])&&b.evaluate(a.f)!==c[d]}function Bl(a,b,c){for(var d in c){var e=b[d];e?(a.F[d]=e,delete b[d]):(e=c[d])&&(a.F[d]=new U(e,33554432))}}var Dl=["column-count","column-width"];
function yl(a,b,c){c||["writing-mode","direction"].forEach(function(a){b[a]&&(this.F[a]=b[a])},a);if(!a.ia){var d=Al(a,b,a.j.g,"background-color")?b["background-color"].evaluate(a.f):null,e=Al(a,b,a.j.g,"background-image")?b["background-image"].evaluate(a.f):null;if(d&&d!==Ld||e&&e!==Ld)Bl(a,b,a.j.g),a.ia=!0}if(!a.ma)for(d=0;d<Dl.length;d++)if(Al(a,b,a.j.j,Dl[d])){Bl(a,b,a.j.j);a.ma=!0;break}if(!c&&(c=b["font-size"])){d=c.evaluate(a.f);c=d.C;switch(d.X){case "em":case "rem":c*=a.f.j;break;case "ex":case "rex":c*=
a.f.j*mc.ex/mc.em;break;case "%":c*=a.f.j/100;break;default:(d=mc[d.X])&&(c*=d)}a.f.O=c}}function Hl(a){for(var b=0;!a.u&&(b+=5E3,Il(a,b,0)!=Number.POSITIVE_INFINITY););return a.F}function xl(a,b){if(b.style instanceof CSSStyleDeclaration){var c=b.getAttribute("style");if(c){var d=a.aa.url,e=new $k(a.Aa,a.j),c=new Ub(c,e);try{dg(new Vf(Lf,c,e,d),Number.POSITIVE_INFINITY,!1,!0,!1,!1)}catch(f){u.b(f,"Style attribute parse error:")}return e.b}}return{}}
function zl(a,b){if(!(b>=a.b)){var c=a.f,d=yh(a.aa,a.root);if(b<d){var e=a.h(a.root,!1),f=e["flow-into"],f=f?f.evaluate(c,"flow-into").toString():"body",f=Jl(a,f,e,a.root,d);0===a.g.b.length&&a.g.push(e,d,!0,f)}d=Bh(a.aa,b);e=zh(a.aa,d,0,!1);if(!(e>=a.b))for(;;){if(1!=d.nodeType)e+=d.textContent.length;else{var g=d;if(e!=yh(a.aa,g))throw Error("Inconsistent offset");var h=a.h(g,!1);if(f=h["flow-into"])f=f.evaluate(c,"flow-into").toString(),Jl(a,f,h,g,e);e++}if(e>=a.b)break;f=d.firstChild;if(null==
f)for(;!(f=d.nextSibling);)if(d=d.parentNode,d===a.root)return;d=f}}}function Kl(a,b){a.B=b;for(var c=0;c<a.w.length;c++)Ll(a.B,a.w[c],a.l[a.w[c].b])}
function Jl(a,b,c,d,e){var f=0,g=Number.POSITIVE_INFINITY,h=!1,l=!1,k=!1,m=c["flow-options"];if(m){var p;a:{if(h=m.evaluate(a.f,"flow-options")){l=new mg;try{h.U(l);p=l.b;break a}catch(r){u.b(r,"toSet:")}}p={}}h=!!p.exclusive;l=!!p["static"];k=!!p.last}(p=c["flow-linger"])&&(g=og(p.evaluate(a.f,"flow-linger"),Number.POSITIVE_INFINITY));(c=c["flow-priority"])&&(f=og(c.evaluate(a.f,"flow-priority"),0));c=a.O[e]||null;p=a.l[b];p||(p=tl(a.g),p=a.l[b]=new di(p?p.g.b:null));d=new ei(b,d,e,f,g,h,l,k,c);
a.w.push(d);a.D==b&&(a.D=null);a.B&&Ll(a.B,d,p);return d}function Ml(a,b,c,d){ql[b]&&(d=a.l[d].b,(0===d.length||d[d.length-1]<c)&&d.push(c));a.O[c]=ol(a.O[c],b)}
function Il(a,b,c){var d=-1;if(b<=a.b&&(d=il(a.e,b),d+=c,d<fl(a.e)))return jl(a.e,d);if(null==a.d)return Number.POSITIVE_INFINITY;for(var e=a.f;;){var f=a.d.firstChild;if(null==f)for(;;){if(1==a.d.nodeType){var f=a.N,g=a.d;if(f.ib.pop()!==g)throw Error("Invalid call to popElement");f.yb.pop();f.ia.pop();f.wb.pop();f.xb.pop();f.pop();Lk(f);a.Oa=a.Y.pop();g=a.g.pop(a.b);f=null;g.d&&(f=pl(g.d,"before"),Ml(a,f,g.d.Ea?vl(a.g,g):g.d.offset,g.b),f=pl(g.d,"after"));f=ol(f,pl(g,"after"));Ml(a,f,a.b,g.b)}if(f=
a.d.nextSibling)break;a.d=a.d.parentNode;if(a.d===a.root)return a.d=null,b<a.b&&(0>d&&(d=il(a.e,b),d+=c),d<=fl(a.e))?jl(a.e,d):Number.POSITIVE_INFINITY}a.d=f;if(1!=a.d.nodeType){a.b+=a.d.textContent.length;var f=a.g,g=a.d,h=tl(f);(f.Ea||f.Ka)&&ll(h)&&(h=nl(h,"white-space",Ud).toString(),ci(g,bi(h))||(f.Ea=!1,f.Ka=!1));a.Oa?gl(a.e,a.b):hl(a.e,a.b)}else{g=a.d;f=xl(a,g);a.Y.push(a.Oa);Nk(a.N,g,f);(h=g.getAttribute("id")||g.getAttributeNS("http://www.w3.org/XML/1998/namespace","id"))&&h===a.k&&(a.k=null);
a.u||"body"!=g.localName||g.parentNode!=a.root||(yl(a,f,!0),a.u=!0);if(h=f["flow-into"]){var h=h.evaluate(e,"flow-into").toString(),l=Jl(a,h,f,g,a.b);a.Oa=!!a.qa[h];g=a.g.push(f,a.b,g===a.root,l)}else g=a.g.push(f,a.b,g===a.root);h=vl(a.g,g);Ml(a,g.e,h,g.b);g.f&&(l=pl(g.f,"after"),Ml(a,l,g.f.Ea?h:g.offset,g.b));a.Oa&&rl(g)===J&&(a.Oa=!1);if(yh(a.aa,a.d)!=a.b)throw Error("Inconsistent offset");a.G["e"+a.b]=f;a.b++;a.Oa?gl(a.e,a.b):hl(a.e,a.b);if(b<a.b&&(0>d&&(d=il(a.e,b),d+=c),d<=fl(a.e)))return jl(a.e,
d)}}}wl.prototype.h=function(a,b){var c=yh(this.aa,a),d="e"+c;b&&(c=zh(this.aa,a,0,!0));this.b<=c&&Il(this,c,0);return this.G[d]};var Nl=1;function Ol(a,b,c,d,e){this.b={};this.children=[];this.e=null;this.index=0;this.d=a;this.name=b;this.sb=c;this.va=d;this.parent=e;this.g="p"+Nl++;e&&(this.index=e.children.length,e.children.push(this))}Ol.prototype.f=function(){throw Error("E_UNEXPECTED_CALL");};Ol.prototype.clone=function(){throw Error("E_UNEXPECTED_CALL");};function Pl(a,b){var c=a.b,d=b.b,e;for(e in c)Object.prototype.hasOwnProperty.call(c,e)&&(d[e]=c[e])}
function Ql(a,b){for(var c=0;c<a.children.length;c++)a.children[c].clone({parent:b})}function Rl(a){Ol.call(this,a,null,null,[],null);this.b.width=new U(me,0);this.b.height=new U(ne,0)}t(Rl,Ol);
function Sl(a,b){this.e=b;var c=this;gc.call(this,a,function(a,b){var f=a.match(/^([^.]+)\.([^.]+)$/);if(f){var g=c.e.h[f[1]];if(g&&(g=this.ia[g])){if(b){var f=f[2],h=g.Y[f];if(h)g=h;else{switch(f){case "columns":var h=g.d.d,l=new Yc(h,0),k=Tl(g,"column-count"),m=Tl(g,"column-width"),p=Tl(g,"column-gap"),h=D(h,$c(h,new Vc(h,"min",[l,k]),C(h,m,p)),p)}h&&(g.Y[f]=h);g=h}}else g=Tl(g,f[2]);return g}}return null})}t(Sl,gc);
function Ul(a,b,c,d,e,f,g){a=a instanceof Sl?a:new Sl(a,this);Ol.call(this,a,b,c,d,e);this.e=this;this.L=f;this.P=g;this.b.width=new U(me,0);this.b.height=new U(ne,0);this.b["wrap-flow"]=new U(wd,0);this.b.position=new U(Yd,0);this.b.overflow=new U(je,0);this.h={}}t(Ul,Ol);Ul.prototype.f=function(a){return new Vl(a,this)};Ul.prototype.clone=function(a){a=new Ul(this.d,this.name,a.sb||this.sb,this.va,this.parent,this.L,this.P);Pl(this,a);Ql(this,a);return a};
function Wl(a,b,c,d,e){Ol.call(this,a,b,c,d,e);this.e=e.e;b&&(this.e.h[b]=this.g);this.b["wrap-flow"]=new U(wd,0)}t(Wl,Ol);Wl.prototype.f=function(a){return new Xl(a,this)};Wl.prototype.clone=function(a){a=new Wl(a.parent.d,this.name,this.sb,this.va,a.parent);Pl(this,a);Ql(this,a);return a};function Yl(a,b,c,d,e){Ol.call(this,a,b,c,d,e);this.e=e.e;b&&(this.e.h[b]=this.g)}t(Yl,Ol);Yl.prototype.f=function(a){return new Zl(a,this)};
Yl.prototype.clone=function(a){a=new Yl(a.parent.d,this.name,this.sb,this.va,a.parent);Pl(this,a);Ql(this,a);return a};function W(a,b,c){return b&&b!==wd?b.ka(a,c):null}function $l(a,b,c){return b&&b!==wd?b.ka(a,c):a.b}function am(a,b,c){return b?b===wd?null:b.ka(a,c):a.b}function bm(a,b,c,d){return b&&c!==J?b.ka(a,d):a.b}function cm(a,b,c){return b?b===ke?a.g:b===Gd?a.f:b.ka(a,a.b):c}
function dm(a,b){this.e=a;this.d=b;this.D={};this.style={};this.k=this.l=null;this.children=[];this.F=this.G=this.f=this.g=!1;this.w=this.B=0;this.u=null;this.ia={};this.Y={};this.qa=this.b=!1;a&&a.children.push(this)}function em(a){a.B=0;a.w=0}function fm(a,b,c){b=Tl(a,b);c=Tl(a,c);if(!b||!c)throw Error("E_INTERNAL");return C(a.d.d,b,c)}
function Tl(a,b){var c=a.ia[b];if(c)return c;var d=a.style[b];d&&(c=d.ka(a.d.d,a.d.d.b));switch(b){case "margin-left-edge":c=Tl(a,"left");break;case "margin-top-edge":c=Tl(a,"top");break;case "margin-right-edge":c=fm(a,"border-right-edge","margin-right");break;case "margin-bottom-edge":c=fm(a,"border-bottom-edge","margin-bottom");break;case "border-left-edge":c=fm(a,"margin-left-edge","margin-left");break;case "border-top-edge":c=fm(a,"margin-top-edge","margin-top");break;case "border-right-edge":c=
fm(a,"padding-right-edge","border-right-width");break;case "border-bottom-edge":c=fm(a,"padding-bottom-edge","border-bottom-width");break;case "padding-left-edge":c=fm(a,"border-left-edge","border-left-width");break;case "padding-top-edge":c=fm(a,"border-top-edge","border-top-width");break;case "padding-right-edge":c=fm(a,"right-edge","padding-right");break;case "padding-bottom-edge":c=fm(a,"bottom-edge","padding-bottom");break;case "left-edge":c=fm(a,"padding-left-edge","padding-left");break;case "top-edge":c=
fm(a,"padding-top-edge","padding-top");break;case "right-edge":c=fm(a,"left-edge","width");break;case "bottom-edge":c=fm(a,"top-edge","height")}if(!c){if("extent"==b)d=a.b?"width":"height";else if("measure"==b)d=a.b?"height":"width";else{var e=a.b?jj:kj,d=b,f;for(f in e)d=d.replace(f,e[f])}d!=b&&(c=Tl(a,d))}c&&(a.ia[b]=c);return c}
function gm(a){var b=a.d.d,c=a.style,d=cm(b,c.enabled,b.g),e=W(b,c.page,b.b);if(e)var f=new Tc(b,"page-number"),d=Zc(b,d,new Lc(b,e,f));(e=W(b,c["min-page-width"],b.b))&&(d=Zc(b,d,new Kc(b,new Tc(b,"page-width"),e)));(e=W(b,c["min-page-height"],b.b))&&(d=Zc(b,d,new Kc(b,new Tc(b,"page-height"),e)));d=a.N(d);c.enabled=new I(d)}dm.prototype.N=function(a){return a};
dm.prototype.Wc=function(){var a=this.d.d,b=this.style,c=this.e?this.e.style.width.ka(a,null):null,d=W(a,b.left,c),e=W(a,b["margin-left"],c),f=bm(a,b["border-left-width"],b["border-left-style"],c),g=$l(a,b["padding-left"],c),h=W(a,b.width,c),l=W(a,b["max-width"],c),k=$l(a,b["padding-right"],c),m=bm(a,b["border-right-width"],b["border-right-style"],c),p=W(a,b["margin-right"],c),r=W(a,b.right,c),w=C(a,f,g),q=C(a,f,k);d&&r&&h?(w=D(a,c,C(a,h,C(a,C(a,d,w),q))),e?p?r=D(a,w,p):p=D(a,w,C(a,r,e)):(w=D(a,w,
r),p?e=D(a,w,p):p=e=$c(a,w,new hc(a,.5)))):(e||(e=a.b),p||(p=a.b),d||r||h||(d=a.b),d||h?d||r?h||r||(h=this.l,this.g=!0):d=a.b:(h=this.l,this.g=!0),w=D(a,c,C(a,C(a,e,w),C(a,p,q))),this.g&&(l||(l=D(a,w,d?d:r)),this.b||!W(a,b["column-width"],null)&&!W(a,b["column-count"],null)||(h=l,this.g=!1)),d?h?r||(r=D(a,w,C(a,d,h))):h=D(a,w,C(a,d,r)):d=D(a,w,C(a,r,h)));a=$l(a,b["snap-width"]||(this.e?this.e.style["snap-width"]:null),c);b.left=new I(d);b["margin-left"]=new I(e);b["border-left-width"]=new I(f);b["padding-left"]=
new I(g);b.width=new I(h);b["max-width"]=new I(l?l:h);b["padding-right"]=new I(k);b["border-right-width"]=new I(m);b["margin-right"]=new I(p);b.right=new I(r);b["snap-width"]=new I(a)};
dm.prototype.Xc=function(){var a=this.d.d,b=this.style,c=this.e?this.e.style.width.ka(a,null):null,d=this.e?this.e.style.height.ka(a,null):null,e=W(a,b.top,d),f=W(a,b["margin-top"],c),g=bm(a,b["border-top-width"],b["border-top-style"],c),h=$l(a,b["padding-top"],c),l=W(a,b.height,d),k=W(a,b["max-height"],d),m=$l(a,b["padding-bottom"],c),p=bm(a,b["border-bottom-width"],b["border-bottom-style"],c),r=W(a,b["margin-bottom"],c),w=W(a,b.bottom,d),q=C(a,g,h),y=C(a,p,m);e&&w&&l?(d=D(a,d,C(a,l,C(a,C(a,e,q),
y))),f?r?w=D(a,d,f):r=D(a,d,C(a,w,f)):(d=D(a,d,w),r?f=D(a,d,r):r=f=$c(a,d,new hc(a,.5)))):(f||(f=a.b),r||(r=a.b),e||w||l||(e=a.b),e||l?e||w?l||w||(l=this.k,this.f=!0):e=a.b:(l=this.k,this.f=!0),d=D(a,d,C(a,C(a,f,q),C(a,r,y))),this.f&&(k||(k=D(a,d,e?e:w)),this.b&&(W(a,b["column-width"],null)||W(a,b["column-count"],null))&&(l=k,this.f=!1)),e?l?w||(w=D(a,d,C(a,e,l))):l=D(a,d,C(a,w,e)):e=D(a,d,C(a,w,l)));a=$l(a,b["snap-height"]||(this.e?this.e.style["snap-height"]:null),c);b.top=new I(e);b["margin-top"]=
new I(f);b["border-top-width"]=new I(g);b["padding-top"]=new I(h);b.height=new I(l);b["max-height"]=new I(k?k:l);b["padding-bottom"]=new I(m);b["border-bottom-width"]=new I(p);b["margin-bottom"]=new I(r);b.bottom=new I(w);b["snap-height"]=new I(a)};
function hm(a){var b=a.d.d,c=a.style;a=W(b,c[a.b?"height":"width"],null);var d=W(b,c["column-width"],a),e=W(b,c["column-count"],null),f;(f=(f=c["column-gap"])&&f!==Ud?f.ka(b,null):null)||(f=new Sc(b,1,"em"));d&&!e&&(e=new Vc(b,"floor",[ad(b,C(b,a,f),C(b,d,f))]),e=new Vc(b,"max",[b.d,e]));e||(e=b.d);d=D(b,ad(b,C(b,a,f),e),f);c["column-width"]=new I(d);c["column-count"]=new I(e);c["column-gap"]=new I(f)}function im(a,b,c,d){a=a.style[b].ka(a.d.d,null);return vc(a,c,d,{})}
function jm(a,b){b.ia[a.d.g]=a;var c=a.d.d,d=a.style,e=a.e?km(a.e,b):null,e=bl(a.D,b,e,!1);a.b=al(e,b,a.e?a.e.b:!1);cl(e,d,a.b,function(a,b){return b.value});a.l=new jc(c,function(){return a.B},"autoWidth");a.k=new jc(c,function(){return a.w},"autoHeight");a.Wc();a.Xc();hm(a);gm(a)}function lm(a,b,c){(a=a.style[c])&&(a=lg(b,a,c));return a}function Y(a,b,c){(a=a.style[c])&&(a=lg(b,a,c));return sd(a,b)}
function km(a,b){var c;a:{if(c=a.D["region-id"]){for(var d=[],e=0;e<c.length;e++){var f=c[e].evaluate(b,"");f&&f!==F&&d.push(f)}if(d.length){c=d;break a}}c=null}if(c){d=[];for(e=0;e<c.length;e++)d[e]=c[e].toString();return d}return null}function mm(a,b,c,d,e){if(a=lm(a,b,d))a.$b()&&nc(a.X)&&(a=new H(sd(a,b),"px")),"font-family"===d&&(a=ph(e,a)),v(c.element,d,a.toString())}
function nm(a,b,c){var d=Y(a,b,"left"),e=Y(a,b,"margin-left"),f=Y(a,b,"padding-left"),g=Y(a,b,"border-left-width");a=Y(a,b,"width");Ji(c,d,a);v(c.element,"margin-left",e+"px");v(c.element,"padding-left",f+"px");v(c.element,"border-left-width",g+"px");c.marginLeft=e;c.N=g;c.h=f}
function om(a,b,c){var d=Y(a,b,"right"),e=Y(a,b,"snap-height"),f=Y(a,b,"margin-right"),g=Y(a,b,"padding-right");b=Y(a,b,"border-right-width");v(c.element,"margin-right",f+"px");v(c.element,"padding-right",g+"px");v(c.element,"border-right-width",b+"px");c.marginRight=f;c.Ja=b;a.b&&0<e&&(a=d+Gi(c),a=a-Math.floor(a/e)*e,0<a&&(c.yb=e-a,g+=c.yb));c.u=g;c.Gb=e}
function pm(a,b,c){var d=Y(a,b,"snap-height"),e=Y(a,b,"top"),f=Y(a,b,"margin-top"),g=Y(a,b,"padding-top");b=Y(a,b,"border-top-width");c.top=e;c.marginTop=f;c.O=b;c.bb=d;!a.b&&0<d&&(a=e+Di(c),a=a-Math.floor(a/d)*d,0<a&&(c.ma=d-a,g+=c.ma));c.j=g;v(c.element,"top",e+"px");v(c.element,"margin-top",f+"px");v(c.element,"padding-top",g+"px");v(c.element,"border-top-width",b+"px")}
function qm(a,b,c){var d=Y(a,b,"margin-bottom"),e=Y(a,b,"padding-bottom"),f=Y(a,b,"border-bottom-width");a=Y(a,b,"height")-c.ma;v(c.element,"height",a+"px");v(c.element,"margin-bottom",d+"px");v(c.element,"padding-bottom",e+"px");v(c.element,"border-bottom-width",f+"px");c.height=a-c.ma;c.marginBottom=d;c.Aa=f;c.l=e}function rm(a,b,c){a.b?(pm(a,b,c),qm(a,b,c)):(om(a,b,c),nm(a,b,c))}
function sm(a,b,c){v(c.element,"border-top-width","0px");var d=Y(a,b,"max-height");a.G?Ii(c,0,d):(pm(a,b,c),d-=c.ma,c.height=d,v(c.element,"height",d+"px"))}function tm(a,b,c){v(c.element,"border-left-width","0px");var d=Y(a,b,"max-width");a.F?Ji(c,0,d):(om(a,b,c),d-=c.yb,c.width=d,a=Y(a,b,"right"),v(c.element,"right",a+"px"),v(c.element,"width",d+"px"))}
var um="border-left-style border-right-style border-top-style border-bottom-style border-left-color border-right-color border-top-color border-bottom-color outline-style outline-color outline-width overflow visibility".split(" "),vm="border-top-left-radius border-top-right-radius border-bottom-right-radius border-bottom-left-radius border-image-source border-image-slice border-image-width border-image-outset border-image-repeat background-attachment background-color background-image background-repeat background-position background-clip background-origin background-size opacity z-index".split(" "),
wm="color font-family font-size font-style font-weight font-variant line-height letter-spacing text-align text-decoration text-indent text-transform white-space word-spacing".split(" "),xm=["transform","transform-origin"];
dm.prototype.rb=function(a,b,c,d){this.e&&this.b==this.e.b||v(b.element,"writing-mode",this.b?"vertical-rl":"horizontal-tb");(this.b?this.g:this.f)?this.b?tm(this,a,b):sm(this,a,b):(this.b?om(this,a,b):pm(this,a,b),this.b?nm(this,a,b):qm(this,a,b));(this.b?this.f:this.g)?this.b?sm(this,a,b):tm(this,a,b):rm(this,a,b);for(c=0;c<um.length;c++)mm(this,a,b,um[c],d)};function ym(a,b,c,d){for(var e=0;e<wm.length;e++)mm(a,b,c,wm[e],d)}
dm.prototype.uc=function(a,b,c,d,e,f,g){this.b?this.B=b.d+b.yb:this.w=b.d+b.ma;f=(this.b||!d)&&this.f;var h=(!this.b||!d)&&this.g,l=null;if(h||f)h&&v(b.element,"width","auto"),f&&v(b.element,"height","auto"),l=(d?d.element:b.element).getBoundingClientRect(),h&&(this.B=Math.ceil(l.right-l.left-b.h-b.N-b.u-b.Ja),this.b&&(this.B+=b.yb)),f&&(this.w=l.bottom-l.top-b.j-b.O-b.l-b.Aa,this.b||(this.w+=b.ma));(this.b?this.f:this.g)&&rm(this,a,b);if(this.b?this.g:this.f){if(this.b?this.F:this.G)this.b?om(this,
a,b):pm(this,a,b);this.b?nm(this,a,b):qm(this,a,b)}if(1<e&&(f=Y(this,a,"column-rule-width"),h=lm(this,a,"column-rule-style"),l=lm(this,a,"column-rule-color"),0<f&&h&&h!=J&&l!=ge)){var k=Y(this,a,"column-gap"),m=this.b?b.height:b.width,p=this.b?"border-top":"border-left";for(d=1;d<e;d++){var r=(m+k)*d/e-k/2+b.h-f/2,w=b.height+b.j+b.l,q=b.element.ownerDocument.createElement("div");v(q,"position","absolute");v(q,this.b?"left":"top","0px");v(q,this.b?"top":"left",r+"px");v(q,this.b?"height":"width","0px");
v(q,this.b?"width":"height",w+"px");v(q,p,f+"px "+h.toString()+(l?" "+l.toString():""));b.element.insertBefore(q,b.element.firstChild)}}for(d=0;d<vm.length;d++)mm(this,a,b,vm[d],g);for(d=0;d<xm.length;d++)e=b,g=xm[d],f=c.h,(h=lm(this,a,g))&&f.push(new Uh(e.element,g,h))};
dm.prototype.h=function(a,b){var c=this.D,d=this.d.b,e;for(e in d)oj(e)&&pj(c,e,d[e]);if("background-host"==this.d.sb)for(e in b)if(e.match(/^background-/)||"writing-mode"==e)c[e]=b[e];if("layout-host"==this.d.sb)for(e in b)e.match(/^background-/)||"writing-mode"==e||(c[e]=b[e]);Hk(a,this.d.va,null,c);c.content&&(c.content=c.content.tc(new mk(a,null,a.Pa)));jm(this,a.h);for(c=0;c<this.d.children.length;c++)this.d.children[c].f(this).h(a,b);a.pop()};
function zm(a,b){a.g&&(a.F=im(a,"right",a.l,b)||im(a,"margin-right",a.l,b)||im(a,"border-right-width",a.l,b)||im(a,"padding-right",a.l,b));a.f&&(a.G=im(a,"top",a.k,b)||im(a,"margin-top",a.k,b)||im(a,"border-top-width",a.k,b)||im(a,"padding-top",a.k,b));for(var c=0;c<a.children.length;c++)zm(a.children[c],b)}function Am(a){dm.call(this,null,a)}t(Am,dm);Am.prototype.h=function(a,b){dm.prototype.h.call(this,a,b);this.children.sort(function(a,b){return b.d.P-a.d.P||a.d.index-b.d.index})};
function Vl(a,b){dm.call(this,a,b);this.u=this}t(Vl,dm);Vl.prototype.N=function(a){var b=this.d.e;b.L&&(a=Zc(b.d,a,b.L));return a};Vl.prototype.O=function(){};function Xl(a,b){dm.call(this,a,b);this.u=a.u}t(Xl,dm);function Zl(a,b){dm.call(this,a,b);this.u=a.u}t(Zl,dm);function Bm(a,b,c,d){var e=null;c instanceof md&&(e=[c]);c instanceof fd&&(e=c.values);if(e)for(a=a.d.d,c=0;c<e.length;c++)if(e[c]instanceof md){var f=dc(e[c].name,"enabled"),f=new Tc(a,f);d&&(f=new Bc(a,f));b=Zc(a,b,f)}return b}
Zl.prototype.N=function(a){var b=this.d.d,c=this.style,d=cm(b,c.required,b.f)!==b.f;if(d||this.f){var e;e=(e=c["flow-from"])?e.ka(b,b.b):new hc(b,"body");e=new Vc(b,"has-content",[e]);a=Zc(b,a,e)}a=Bm(this,a,c["required-partitions"],!1);a=Bm(this,a,c["conflicting-partitions"],!0);d&&(c=(c=this.u.style.enabled)?c.ka(b,null):b.g,c=Zc(b,c,a),this.u.style.enabled=new I(c));return a};Zl.prototype.rb=function(a,b,c,d,e){v(b.element,"overflow","hidden");dm.prototype.rb.call(this,a,b,c,d,e)};
function Cm(a,b,c,d){Gf.call(this,a,b,!1);this.target=c;this.b=d}t(Cm,Hf);Cm.prototype.eb=function(a,b,c){gh(this.b,a,b,c,this)};Cm.prototype.Hc=function(a,b){If(this,"E_INVALID_PROPERTY "+a+": "+b.toString())};Cm.prototype.Zb=function(a,b){If(this,"E_INVALID_PROPERTY_VALUE "+a+": "+b.toString())};Cm.prototype.fb=function(a,b,c){this.target.b[a]=new U(b,c?50331648:67108864)};function Dm(a,b,c,d){Cm.call(this,a,b,c,d)}t(Dm,Cm);
function Em(a,b,c,d){Cm.call(this,a,b,c,d);c.b.width=new U(le,0);c.b.height=new U(le,0)}t(Em,Cm);Em.prototype.jc=function(a,b,c){a=new Yl(this.d,a,b,c,this.target);Ff(this.ba,new Dm(this.d,this.ba,a,this.b))};Em.prototype.ic=function(a,b,c){a=new Wl(this.d,a,b,c,this.target);a=new Em(this.d,this.ba,a,this.b);Ff(this.ba,a)};function Fm(a,b,c,d){Cm.call(this,a,b,c,d)}t(Fm,Cm);Fm.prototype.jc=function(a,b,c){a=new Yl(this.d,a,b,c,this.target);Ff(this.ba,new Dm(this.d,this.ba,a,this.b))};
Fm.prototype.ic=function(a,b,c){a=new Wl(this.d,a,b,c,this.target);a=new Em(this.d,this.ba,a,this.b);Ff(this.ba,a)};var Gm={"text-indent":"0px","margin-top":"0px","padding-top":"0px","border-top-width":"0px","border-top-style":"none","border-top-color":"transparent","border-top-left-radius":"0px","border-top-right-radius":"0px"},Hm={"text-indent":"0px","margin-right":"0px","padding-right":"0px","border-right-width":"0px","border-right-style":"none","border-right-color":"transparent","border-top-right-radius":"0px","border-bottom-right-radius":"0px"},Im={"margin-top":"0px"},Jm={"margin-right":"0px"},Km={};
function Lm(a){a.addEventListener("load",function(){a.contentWindow.navigator.epubReadingSystem={name:"adapt",version:"0.1",layoutStyle:"paginated",hasFeature:function(a){switch(a){case "mouse-events":return!0}return!1}}},!1)}var Mm=(new DOMParser).parseFromString('<root xmlns="http://www.pyroxy.com/ns/shadow"/>',"text/xml"),Nm="footnote-marker first-5-lines first-4-lines first-3-lines first-2-lines first-line first-letter before  after".split(" ");
function Om(a){return a.getAttribute("data-adapt-pseudo")||""}function Pm(a,b,c,d){this.style=b;this.element=a;this.b=c;this.d=d;this.e={}}
Pm.prototype.h=function(a){var b=Om(a);this.b&&b&&b.match(/after$/)&&(this.style=this.b.h(this.element,!0),this.b=null);var c=this.style._pseudos[b]||{};if(!this.e[b]){this.e[b]=!0;var d=c.content;d&&(d=d.evaluate(this.d),Li(d)&&d.U(new Ki(a,this.d)))}if(b.match(/^first-/)&&!c["x-first-pseudo"]){a=1;var e;"first-letter"==b?a=0:null!=(e=b.match(/^first-([0-9]+)-lines$/))&&(a=e[1]-0);c["x-first-pseudo"]=new U(new od(a),0)}return c};
function Qm(a,b,c,d,e,f,g,h,l,k,m,p,r,w){this.w=a;this.d=b;this.viewport=c;this.l=c.b;this.h=d;this.D=e;this.aa=f;this.B=g;this.k=h;this.F=l;this.page=k;this.f=m;this.u=p;this.e=r;this.j=w;this.G=this.b=null;this.g=!1;this.$=null;this.ea=0;this.A=null}Qm.prototype.clone=function(){return new Qm(this.w,this.d,this.viewport,this.h,this.D,this.aa,this.B,this.k,this.F,this.page,this.f,this.u,this.e,this.j)};
function Rm(a,b,c,d,e,f){var g=L("createRefShadow");a.aa.j.load(b).then(function(h){if(h){var l=Dh(h,b);if(l){var k=a.F,m=k.B[h.url];if(!m){var m=k.style.h.d[h.url],p=new oc(0,k.qb(),k.pb(),k.j),m=new wl(h,m.e,m.d,p,k.g,m.j,new Sm(k.f,h.url),new Tm(k.f,h.url,m.d,m.b));k.B[h.url]=m}f=new ki(d,l,h,e,f,c,m)}}O(g,f)});return N(g)}
function Um(a,b,c,d,e,f,g,h){var l=L("createShadows"),k=e.template,m;k instanceof qd?m=Rm(a,k.url,2,b,h,null):m=M(null);m.then(function(k){var m=null;if("http://www.pyroxy.com/ns/shadow"==b.namespaceURI&&"include"==b.localName){var w=b.getAttribute("href"),q=null;w?q=h?h.aa:a.aa:h&&(w="http://www.w3.org/1999/xhtml"==h.ba.namespaceURI?h.ba.getAttribute("href"):h.ba.getAttributeNS("http://www.w3.org/1999/xlink","href"),q=h.ed?h.ed.aa:a.aa);w&&(w=wa(w,q.url),m=Rm(a,w,3,b,h,k))}null==m&&(m=M(k));m.then(function(k){var m;
if(m=d._pseudos){for(var p=[],r=Mm.createElementNS("http://www.pyroxy.com/ns/shadow","root"),q=r,w=0;w<Nm.length;w++){var E=Nm[w],K;if(E){if(!m[E])continue;if(!("footnote-marker"!=E||c&&a.g))continue;if(E.match(/^first-/)&&(K=e.display,!K||K===Md))continue;if("before"===E||"after"===E)if(K=m[E].content,!K||K===Ud||K===J)continue;p.push(E);K=Mm.createElementNS("http://www.w3.org/1999/xhtml","span");K.setAttribute("data-adapt-pseudo",E)}else K=Mm.createElementNS("http://www.pyroxy.com/ns/shadow","content");
q.appendChild(K);E.match(/^first-/)&&(q=K)}k=p.length?new ki(b,r,null,h,k,2,new Pm(b,d,f,g)):k}O(l,k)})});return N(l)}function Vm(a,b,c){a.G=b;a.g=c}function Wm(a,b,c,d){var e=a.d;c=bl(c,e,a.D,a.g);b=al(c,e,b);cl(c,d,b,function(b,c){var d=c.evaluate(e,b);"font-family"==b&&(d=ph(a.B,d));return d});var f=Ni(d.display||Md,d.position,d["float"],a.$===a.aa.root);["display","position","float"].forEach(function(a){f[a]&&(d[a]=f[a])});return b}
function Xm(a,b){for(var c=a.b.$,d=[],e=a.b.fa,f=-1;c&&1==c.nodeType;){var g=e&&e.root==c;if(!g||2==e.type){var h=(e?e.b:a.h).h(c,!1);d.push(h)}g?(c=e.ba,e=e.ed):(c=c.parentNode,f++)}c=qc(a.d,"em",0===f);c={"font-size":new U(new H(c,"px"),0)};e=new uj(c,a.d);for(f=d.length-1;0<=f;--f){var g=d[f],h=[],l;for(l in g)$i[l]&&h.push(l);h.sort(qe);for(var k=0;k<h.length;k++){var m=h[k];e.d=m;var p=g[m];p.value!==Ld&&(c[m]=p.tc(e))}}for(var r in b)$i[r]||(c[r]=b[r]);return c}
var Ym={a:"a",sub:"sub",sup:"sup",table:"table",tr:"tr",td:"td",th:"th",code:"code",body:"div",p:"p",v:"p",date:"p",emphasis:"em",strong:"strong",style:"span",strikethrough:"del"};function Zm(a,b){b=wa(b,a.aa.url);return a.u[b]||b}
function $m(a,b){var c=aj.filter(function(a){return b[a]});if(c.length){var d=a.b.g;if(a.b.parent){var d=a.b.g={},e;for(e in a.b.parent.g)d[e]=a.b.parent.g[e]}c.forEach(function(a){var c=b[a];if(c){if(c instanceof od)d[a]=c.C;else if(c instanceof md)d[a]=c.name;else if(c instanceof H)switch(c.X){case "dpi":case "dpcm":case "dppx":d[a]=c.C*mc[c.X]}delete b[a]}})}}
function an(a,b,c){var d=!0,e=L("createElementView"),f=a.$,g=a.b.fa?a.b.fa.b:a.h,h=g.h(f,!1),l={};a.b.parent||(h=Xm(a,h));a.b.b=Wm(a,a.b.b,h,l);$m(a,l);l.direction&&(a.b.N=l.direction.toString());var k=l["flow-into"];if(k&&k.toString()!=a.w)return O(e,!1),N(e);var m=l.display;if(m===J)return O(e,!1),N(e);k=null==a.b.parent;a.b.B=m===Id;Um(a,f,k,h,l,g,a.d,a.b.fa).then(function(g){a.b.ra=g;var h=l.position;g=l["float-reference"];var k=l["float"],q=l.clear,y=a.b.b?ie:Kd;a.b.G=Oi(m,h,k,l.overflow,y,a.b.parent?
a.b.parent.b?ie:Kd:y);a.b.F=h===Yd||h===td||h===Hd;si(a.b)&&(q=null,k!==Jd&&(k=null));h=k===Rd||k===Zd||k===fe||k===Bd||k===Pd||k===Od||k===zd||k===yd||k===Jd;k&&(delete l["float"],k===Jd&&(a.g?(h=!1,l.display=xd):l.display=Md));q&&(q===Ld&&a.b.parent&&a.b.parent.l&&(q=G(a.b.parent.l)),q===Rd||q===Zd||q===Ad)&&(delete l.clear,l.display&&l.display!=Md&&(a.b.l=q.toString()));var S=m===Sd&&l["ua-list-item-count"];h||l["break-inside"]&&l["break-inside"]!==wd?a.b.j++:m===ee&&(a.b.j+=10);a.b.e=!h&&!m||
m===Md;a.b.display=m?m.toString():"inline";a.b.k=h?k.toString():null;a.b.Y=g?g.toString():null;if(!a.b.e){if(g=l["break-after"])a.b.D=g.toString();if(g=l["break-before"])a.b.h=g.toString()}if(g=l["x-first-pseudo"])a.b.f=new li(a.b.parent?a.b.parent.f:null,g.C);if(g=l["white-space"])g=bi(g.toString()),null!==g&&(a.b.w=g);var X=!1,ga=null,La=[],ma=f.namespaceURI,E=f.localName;if("http://www.w3.org/1999/xhtml"==ma)"html"==E||"body"==E||"script"==E||"link"==E||"meta"==E?E="div":"vide_"==E?E="video":"audi_"==
E?E="audio":"object"==E&&(X=!!a.f);else if("http://www.idpf.org/2007/ops"==ma)E="span",ma="http://www.w3.org/1999/xhtml";else if("http://www.gribuser.ru/xml/fictionbook/2.0"==ma){ma="http://www.w3.org/1999/xhtml";if("image"==E){if(E="div",(g=f.getAttributeNS("http://www.w3.org/1999/xlink","href"))&&"#"==g.charAt(0)&&(g=Dh(a.aa,g)))ga=a.createElement(ma,"img"),g="data:"+(g.getAttribute("content-type")||"image/jpeg")+";base64,"+g.textContent.replace(/[ \t\n\t]/g,""),La.push(vg(ga,g))}else E=Ym[E];E||
(E=a.b.e?"span":"div")}else if("http://www.daisy.org/z3986/2005/ncx/"==ma)if(ma="http://www.w3.org/1999/xhtml","ncx"==E||"navPoint"==E)E="div";else if("navLabel"==E){if(E="span",k=f.parentNode){g=null;for(k=k.firstChild;k;k=k.nextSibling)if(1==k.nodeType&&(q=k,"http://www.daisy.org/z3986/2005/ncx/"==q.namespaceURI&&"content"==q.localName)){g=q.getAttribute("src");break}g&&(E="a",f=f.ownerDocument.createElementNS(ma,"a"),f.setAttribute("href",g))}}else E="span";else"http://www.pyroxy.com/ns/shadow"==
ma?(ma="http://www.w3.org/1999/xhtml",E=a.b.e?"span":"div"):X=!!a.f;S?b?E="li":(E="div",m=xd,l.display=m):"body"==E||"li"==E?E="div":"q"==E?E="span":"a"==E&&(g=l["hyperlink-processing"])&&"normal"!=g.toString()&&(E="span");l.behavior&&"none"!=l.behavior.toString()&&a.f&&(X=!0);f.dataset&&"true"==f.dataset.mathTypeset&&(X=!0);var K;X?K=a.f(f,a.b.parent?a.b.parent.A:null,l):K=M(null);K.then(function(g){g?X&&(d="true"==g.getAttribute("data-adapt-process-children")):g=a.createElement(ma,E);"a"==E&&g.addEventListener("click",
a.page.D,!1);ga&&(bn(a,a.b,"inner",ga),g.appendChild(ga));"iframe"==g.localName&&"http://www.w3.org/1999/xhtml"==g.namespaceURI&&Lm(g);var h=a.b.g["image-resolution"],k=[],m=l.width,p=l.height,r=f.getAttribute("width"),q=f.getAttribute("height"),m=m===wd||!m&&!r,p=p===wd||!p&&!q;if("http://www.gribuser.ru/xml/fictionbook/2.0"!=f.namespaceURI||"td"==E){for(var r=f.attributes,w=r.length,q=null,y=0;y<w;y++){var K=r[y],Lb=K.namespaceURI,ya=K.localName,K=K.nodeValue;if(Lb)if("http://www.w3.org/2000/xmlns/"==
Lb)continue;else"http://www.w3.org/1999/xlink"==Lb&&"href"==ya&&(K=Zm(a,K));else{if(ya.match(/^on/))continue;if("style"==ya)continue;if(("id"==ya||"name"==ya)&&b){K=a.j.ld(K,a.aa.url);g.setAttribute(ya,K);$h(a.page,g,K);continue}"src"==ya||"href"==ya||"poster"==ya?(K=Zm(a,K),"href"===ya&&(K=a.j.b(K,a.aa.url))):"srcset"==ya&&(K=K.split(",").map(function(b){return Zm(a,b.trim())}).join(","));if("poster"===ya&&"video"===E&&"http://www.w3.org/1999/xhtml"===ma&&m&&p){var fc=new Image,Fl=vg(fc,K);La.push(Fl);
k.push({Ld:fc,element:g,Jd:Fl})}}Lb&&(fc=Km[Lb])&&(ya=fc+":"+ya);"src"!=ya||Lb||"img"!=E&&"input"!=E||"http://www.w3.org/1999/xhtml"!=ma?"href"==ya&&"image"==E&&"http://www.w3.org/2000/svg"==ma&&"http://www.w3.org/1999/xlink"==Lb?a.page.g.push(vg(g,K)):Lb?g.setAttributeNS(Lb,ya,K):g.setAttribute(ya,K):q=K}q&&(fc="input"===E?new Image:g,r=vg(fc,q),fc!==g&&(g.src=q),m||p?(m&&p&&h&&1!==h&&k.push({Ld:fc,element:g,Jd:r}),La.push(r)):a.page.g.push(r))}delete l.content;(m=l["list-style-image"])&&m instanceof
qd&&(m=m.url,La.push(vg(new Image,m)));cn(a,g,l);if(!a.b.e&&(m=null,b?c&&(m=a.b.b?Jm:Im):m="clone"!==a.b.g["box-decoration-break"]?a.b.b?Hm:Gm:a.b.b?Jm:Im,m))for(var Gl in m)v(g,Gl,m[Gl]);S&&g.setAttribute("value",l["ua-list-item-count"].stringValue());a.A=g;La.length?ug(La).then(function(){0<h&&dn(a,k,h,l,a.b.b);O(e,d)}):nf().then(function(){O(e,d)})})});return N(e)}
function dn(a,b,c,d,e){b.forEach(function(b){if("load"===b.Jd.get().get()){var g=b.Ld,h=g.width/c,g=g.height/c;b=b.element;if(0<h&&0<g)if(d["box-sizing"]===Cd&&(d["border-left-style"]!==J&&(h+=sd(d["border-left-width"],a.d)),d["border-right-style"]!==J&&(h+=sd(d["border-right-width"],a.d)),d["border-top-style"]!==J&&(g+=sd(d["border-top-width"],a.d)),d["border-bottom-style"]!==J&&(g+=sd(d["border-bottom-width"],a.d))),1<c){var l=d["max-width"]||J,k=d["max-height"]||J;l===J&&k===J?v(b,"max-width",
h+"px"):l!==J&&k===J?v(b,"width",h+"px"):l===J&&k!==J?v(b,"height",g+"px"):"%"!==l.X?v(b,"max-width",Math.min(h,sd(l,a.d))+"px"):"%"!==k.X?v(b,"max-height",Math.min(g,sd(k,a.d))+"px"):e?v(b,"height",g+"px"):v(b,"width",h+"px")}else 1>c&&(l=d["min-width"]||oe,k=d["min-height"]||oe,0===l.C&&0===k.C?v(b,"min-width",h+"px"):0!==l.C&&0===k.C?v(b,"width",h+"px"):0===l.C&&0!==k.C?v(b,"height",g+"px"):"%"!==l.X?v(b,"min-width",Math.max(h,sd(l,a.d))+"px"):"%"!==k.X?v(b,"min-height",Math.max(g,sd(k,a.d))+"px"):
e?v(b,"height",g+"px"):v(b,"width",h+"px"))}})}function en(a,b,c){var d=L("createNodeView"),e=!0;1==a.$.nodeType?b=an(a,b,c):(8==a.$.nodeType?a.A=null:a.A=document.createTextNode(a.$.textContent.substr(a.ea||0)),b=M(!0));b.then(function(b){e=b;(a.b.A=a.A)&&(b=a.b.parent?a.b.parent.A:a.G)&&b.appendChild(a.A);O(d,e)});return N(d)}function fn(a,b,c,d){(a.b=b)?(a.$=b.$,a.ea=b.ea):(a.$=null,a.ea=-1);a.A=null;return a.b?en(a,c,!!d):M(!0)}
function gn(a){if(null==a.fa||"content"!=a.$.localName||"http://www.pyroxy.com/ns/shadow"!=a.$.namespaceURI)return a;var b=a.ja,c=a.fa,d=a.parent,e,f;c.Ed?(f=c.Ed,e=c.root,c=c.type,2==c&&(e=e.firstChild)):(f=c.ed,e=c.ba.firstChild,c=2);var g=a.$.nextSibling;g?(a.$=g,ni(a)):a.oa?a=a.oa:e?a=null:(a=a.parent.modify(),a.I=!0);if(e)return b=new mi(e,d,b),b.fa=f,b.Ia=c,b.oa=a,b;a.ja=b;return a}
function hn(a){var b=a.ja+1;if(a.I){if(!a.parent)return null;if(3!=a.Ia){var c=a.$.nextSibling;if(c)return a=a.modify(),a.ja=b,a.$=c,ni(a),gn(a)}if(a.oa)return a=a.oa.modify(),a.ja=b,a;a=a.parent.modify()}else{if(a.ra&&(c=a.ra.root,2==a.ra.type&&(c=c.firstChild),c))return b=new mi(c,a,b),b.fa=a.ra,b.Ia=a.ra.type,gn(b);if(c=a.$.firstChild)return gn(new mi(c,a,b));1!=a.$.nodeType&&(b+=a.$.textContent.length-1-a.ea);a=a.modify()}a.ja=b;a.I=!0;return a}
function jn(a,b,c){b=hn(b);if(!b||b.I)return M(b);var d=L("nextInTree");fn(a,b,!0,c).then(function(a){b.A&&a||(b=b.modify(),b.I=!0,b.A||(b.e=!0));O(d,b)});return N(d)}function kn(a,b){if(b instanceof fd)for(var c=b.values,d=0;d<c.length;d++)kn(a,c[d]);else b instanceof qd&&(c=b.url,a.page.g.push(vg(new Image,c)))}var ln={"box-decoration-break":!0,"flow-into":!0,"flow-linger":!0,"flow-priority":!0,"flow-options":!0,page:!0,"float-reference":!0};
function cn(a,b,c){var d=c["background-image"];d&&kn(a,d);var d=c.position===Yd,e;for(e in c)if(!ln[e]){var f=c[e];f.$b()&&nc(f.X)&&(f=new H(sd(f,a.d),"px"));Sh[e]||d&&Th[e]?a.page.h.push(new Uh(b,e,f)):v(b,e,f.toString())}}function bn(a,b,c,d){if(!b.I){var e=(b.fa?b.fa.b:a.h).h(a.$,!1);if(e=e._pseudos)if(e=e[c])c={},b.b=Wm(a,b.b,e,c),b=c.content,Li(b)&&(b.U(new Ki(d,a.d)),delete c.content),cn(a,d,c)}}
function mn(a,b,c){var d=L("peelOff"),e=b.f,f=b.ea,g=b.I;if(0<c)b.A.textContent=b.A.textContent.substr(0,c),f+=c;else if(!g&&b.A&&0==f){var h=b.A.parentNode;h&&h.removeChild(b.A)}for(var l=b.ja+c,k=[];b.f===e;)k.push(b),b=b.parent;var m=k.pop(),p=m.oa;pf(function(){for(;0<k.length;){m=k.pop();b=new mi(m.$,b,l);0==k.length&&(b.ea=f,b.I=g);b.Ia=m.Ia;b.fa=m.fa;b.ra=m.ra;b.oa=m.oa?m.oa:p;p=null;var c=fn(a,b,!1);if(c.Ca())return c}return M(!1)}).then(function(){O(d,b)});return N(d)}
Qm.prototype.createElement=function(a,b){return"http://www.w3.org/1999/xhtml"==a?this.l.createElement(b):this.l.createElementNS(a,b)};function nn(a,b,c){var d={},e=a.k._pseudos;b=Wm(a,b,a.k,d);if(e&&e.before){var f={},g=a.createElement("http://www.w3.org/1999/xhtml","span");g.setAttribute("data-adapt-pseudo","before");c.appendChild(g);Wm(a,b,e.before,f);delete f.content;cn(a,g,f)}delete d.content;cn(a,c,d);return b}
function on(a){ui(a,function(a){var c=a.g["box-decoration-break"];c&&"slice"!==c||(c=a.A,a.b?(v(c,"padding-left","0"),v(c,"border-left","none"),v(c,"border-top-left-radius","0"),v(c,"border-bottom-left-radius","0")):(v(c,"padding-bottom","0"),v(c,"border-bottom","none"),v(c,"border-bottom-left-radius","0"),v(c,"border-bottom-right-radius","0")))})}
function Ui(a,b,c){return b.ea===c.ea&&b.I==c.I&&b.ha.length===c.ha.length&&b.ha.every(function(a,b){var f;f=c.ha[b];if(a.fa)if(f.fa){var g=1===a.ga.nodeType?a.ga:a.ga.parentElement,h=1===f.ga.nodeType?f.ga:f.ga.parentElement;f=a.fa.ba===f.fa.ba&&Om(g)===Om(h)}else f=!1;else f=a.ga===f.ga;return f}.bind(a))}function pn(a){this.b=a}function qn(a){return a.getClientRects()}function rn(a,b){return a.b.getComputedStyle(b,null)}
function sn(a,b,c,d,e){this.f=a;this.fontSize=b;this.b=a.document;this.root=c||this.b.body;b=this.root.firstElementChild;b||(b=this.b.createElement("div"),b.setAttribute("data-vivliostyle-outer-zoom-box",!0),this.root.appendChild(b));c=b.firstElementChild;c||(c=this.b.createElement("div"),c.setAttribute("data-vivliostyle-spread-container",!0),b.appendChild(c));this.e=b;this.d=c;b=rn(new pn(a),this.root);this.width=d||parseFloat(b.width)||a.innerWidth;this.height=e||parseFloat(b.height)||a.innerHeight}
sn.prototype.zoom=function(a,b,c){v(this.e,"width",a*c+"px");v(this.e,"height",b*c+"px");v(this.d,"width",a+"px");v(this.d,"height",b+"px");v(this.d,"transform","scale("+c+")")};Zi("SIMPLE_PROPERTY",function(a){var b=a.name,c=a.value;switch(b){case "page-break-before":case "page-break-after":case "page-break-inside":return{name:b.replace(/^page-/,""),value:c===vd?Xd:c,important:a.important};default:return a}});var ql={page:!0,left:!0,right:!0,recto:!0,verso:!0,column:!0,region:!0},tn={avoid:!0,"avoid-page":!0,"avoid-column":!0,"avoid-region":!0};
function ol(a,b){if(a)if(b){var c=!!ql[a],d=!!ql[b];if(c&&d)switch(b){case "column":return a;case "region":return"column"===a?b:a;default:return b}else return d?b:c?a:tn[b]?b:tn[a]?a:b}else return a;else return b}function un(a){switch(a){case "left":case "right":case "recto":case "verso":return a;default:return"any"}};var vn={img:!0,svg:!0,audio:!0,video:!0};
function wn(a,b,c){var d=a.A;if(!d)return NaN;if(1==d.nodeType){if(a.I){var e=d.getBoundingClientRect();if(e.right>=e.left&&e.bottom>=e.top)return c?e.left:e.bottom}return NaN}var e=NaN,f=d.ownerDocument.createRange(),g=d.textContent.length;if(!g)return NaN;a.I&&(b+=g);b>=g&&(b=g-1);f.setStart(d,b);f.setEnd(d,b+1);a=qn(f);if(b=c){b=document.body;if(null==ab){var h=b.ownerDocument,f=h.createElement("div");f.style.position="absolute";f.style.top="0px";f.style.left="0px";f.style.width="100px";f.style.height=
"100px";f.style.overflow="hidden";f.style.lineHeight="16px";f.style.fontSize="16px";v(f,"writing-mode","vertical-rl");b.appendChild(f);g=h.createTextNode("a a a a a a a a a a a a a a a a");f.appendChild(g);h=h.createRange();h.setStart(g,0);h.setEnd(g,1);g=h.getBoundingClientRect();ab=10>g.right-g.left;b.removeChild(f)}b=ab}if(b){b=d.ownerDocument.createRange();b.setStart(d,0);b.setEnd(d,d.textContent.length);d=qn(b);b=[];for(f=0;f<a.length;f++){g=a[f];for(h=0;h<d.length;h++){var l=d[h];if(g.top>=
l.top&&g.bottom<=l.bottom&&1>Math.abs(g.left-l.left)){b.push({top:g.top,left:l.left,bottom:g.bottom,right:l.right});break}}h==d.length&&(u.b("Could not fix character box"),b.push(g))}a=b}for(b=d=0;b<a.length;b++)f=a[b],g=c?f.bottom-f.top:f.right-f.left,f.right>f.left&&f.bottom>f.top&&(isNaN(e)||g>d)&&(e=c?f.left:f.bottom,d=g);return e}function xn(a,b){this.e=a;this.f=b}xn.prototype.d=function(a,b){return b<this.f?null:yn(a,this,0<b)};xn.prototype.b=function(){return this.f};
function zn(a,b,c,d){this.position=a;this.f=b;this.g=c;this.e=d}zn.prototype.d=function(a,b){var c;b<this.b()?c=null:(a.d=this.e,c=this.position);return c};zn.prototype.b=function(){return(tn[this.f]?1:0)+(this.g?3:0)+(this.position.parent?this.position.parent.j:0)};function An(a,b,c){this.ja=a;this.d=b;this.b=c}
function Bn(a){for(var b=1;b<a.length;b++){var c=a[b-1],d=a[b];c===d?u.b("validateCheckPoints: duplicate entry"):c.ja>=d.ja?u.b("validateCheckPoints: incorrect boxOffset"):c.$==d.$&&(d.I?c.I&&u.b("validateCheckPoints: duplicate after points"):c.I?u.b("validateCheckPoints: inconsistent after point"):d.ja-c.ja!=d.ea-c.ea&&u.b("validateCheckPoints: boxOffset inconsistent with offsetInNode"))}}
function Cn(a,b,c,d){Ci.call(this,a);this.pd=a.lastChild;this.f=b;this.qa=c;this.ab=d;this.$d=a.ownerDocument;this.Jc=!1;this.ia=this.Qa=this.sa=this.Y=this.G=0;this.ib=this.wb=this.k=this.Pa=null;this.qd=!1;this.g=this.e=this.w=null;this.Hd=!0;this.Kc=this.Mc=this.Lc=0}t(Cn,Ci);Cn.prototype.clone=function(){var a=new Cn(this.element,this.f,this.qa,this.ab);Hi(a,this);a.pd=this.pd;a.Jc=this.Jc;a.k=this.k?this.k.clone():null;a.wb=this.wb.concat();return a};
function Dn(a,b){return a.b?b<a.ia:b>a.ia}function En(a,b,c){var d=new mi(b.ga,c,0);d.Ia=b.Ia;d.fa=b.fa;d.ra=b.ra;d.oa=b.oa?En(a,b.oa,pi(c)):null;return d}function Fn(a,b){var c=L("openAllViews"),d=b.ha;Vm(a.f,a.element,a.Jc);var e=d.length-1,f=null;pf(function(){for(;0<=e;){f=En(a,d[e],f);if(0==e&&(f.ea=b.ea,f.I=b.I,f.I))break;var c=fn(a.f,f,0==e&&0==f.ea);e--;if(c.Ca())return c}return M(!1)}).then(function(){O(c,f)});return N(c)}var Gn=/^[^A-Za-z0-9_\u009E\u009F\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02AF\u037B-\u037D\u0386\u0388-\u0482\u048A-\u0527]*([A-Za-z0-9_\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02AF\u037B-\u037D\u0386\u0388-\u0482\u048A-\u0527][^A-Za-z0-9_\u009E\u009F\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02AF\u037B-\u037D\u0386\u0388-\u0482\u048A-\u0527]*)?/;
function Hn(a,b){if(b.f&&b.e&&!b.I&&0==b.f.count&&1!=b.A.nodeType){var c=b.A.textContent.match(Gn);return mn(a.f,b,c[0].length)}return M(b)}function In(a,b,c){var d=L("buildViewToNextBlockEdge");qf(function(d){b.A&&c.push(pi(b));Hn(a,b).then(function(f){f!==b&&(b=f,c.push(pi(b)));jn(a.f,b).then(function(c){(b=c)?Jn(a.ab,b)?b.k&&!a.b?Kn(a,b).then(function(c){b=c;!b||b.d||0<a.f.e.b.length?P(d):sf(d)}):b.e?sf(d):P(d):(b=b.modify(),b.d=!0,P(d)):P(d)})})}).then(function(){O(d,b)});return N(d)}
function Ln(a,b){if(!b.A)return M(b);var c=b.$,d=L("buildDeepElementView");qf(function(d){Hn(a,b).then(function(f){if(f!==b){for(var g=f;g&&g.$!=c;)g=g.parent;if(null==g){b=f;P(d);return}}jn(a.f,f).then(function(f){(b=f)&&b.$!=c?Jn(a.ab,b)?sf(d):(b=b.modify(),b.d=!0,P(d)):P(d)})})}).then(function(){O(d,b)});return N(d)}
function Mn(a,b,c,d,e){var f=a.$d.createElement("div");a.b?(v(f,"height",d+"px"),v(f,"width",e+"px")):(v(f,"width",d+"px"),v(f,"height",e+"px"));v(f,"float",c);v(f,"clear",c);a.element.insertBefore(f,b);return f}function Nn(a){for(var b=a.element.firstChild;b;){var c=b.nextSibling;if(1==b.nodeType){var d=b.style.cssFloat;if("left"==d||"right"==d)a.element.removeChild(b);else break}b=c}}
function On(a){for(var b=a.element.firstChild,c=a.ib,d=a.b?a.b?a.G:a.sa:a.b?a.Qa:a.G,e=a.b?a.b?a.Y:a.Qa:a.b?a.sa:a.Y,f=0;f<c.length;f++){var g=c[f],h=g.S-g.W;g.left=Mn(a,b,"left",g.ca-d,h);g.right=Mn(a,b,"right",e-g.V,h)}}function Pn(a,b,c,d,e){var f;if(b&&b.I&&!b.e&&(f=wn(b,0,a.b),!isNaN(f)))return f;b=c[d];for(e-=b.ja;;){f=wn(b,e,a.b);if(!isNaN(f))return f;if(0<e)e--;else{d--;if(0>d)return a.sa;b=c[d];1!=b.A.nodeType&&(e=b.A.textContent.length)}}}
function Z(a){return"number"==typeof a?a:(a=a.match(/^(-?[0-9]*(\.[0-9]*)?)px$/))?parseFloat(a[0]):0}function Qn(a,b){var c=rn(a.qa,b),d=new te;c&&(d.left=Z(c.marginLeft),d.top=Z(c.marginTop),d.right=Z(c.marginRight),d.bottom=Z(c.marginBottom));return d}
function Rn(a,b){var c=rn(a.qa,b),d=new te;if(c){if("border-box"==c.boxSizing)return Qn(a,b);d.left=Z(c.marginLeft)+Z(c.borderLeftWidth)+Z(c.paddingLeft);d.top=Z(c.marginTop)+Z(c.borderTopWidth)+Z(c.paddingTop);d.right=Z(c.marginRight)+Z(c.borderRightWidth)+Z(c.paddingRight);d.bottom=Z(c.marginBottom)+Z(c.borderBottomWidth)+Z(c.paddingBottom)}return d}
function Sn(a,b,c){if(a=rn(a.qa,b))c.marginLeft=Z(a.marginLeft),c.N=Z(a.borderLeftWidth),c.h=Z(a.paddingLeft),c.marginTop=Z(a.marginTop),c.O=Z(a.borderTopWidth),c.j=Z(a.paddingTop),c.marginRight=Z(a.marginRight),c.Ja=Z(a.borderRightWidth),c.u=Z(a.paddingRight),c.marginBottom=Z(a.marginBottom),c.Aa=Z(a.borderBottomWidth),c.l=Z(a.paddingBottom)}function Tn(a,b,c){b=new An(b,c,c);a.e?a.e.push(b):a.e=[b]}
function Un(a,b,c,d){if(a.e&&a.e[a.e.length-1].b)return Tn(a,b,c),M(!0);d+=40*(a.b?-1:1);var e=a.k,f=!e;if(f){var g=a.element.ownerDocument.createElement("div");v(g,"position","absolute");var h=a.f.clone(),e=new Cn(g,h,a.qa,a.ab);a.k=e;e.b=nn(a.f,a.b,g);e.Jc=!0;a.b?(e.left=0,v(e.element,"width","2em")):(e.top=a.Qa,v(e.element,"height","2em"))}a.element.appendChild(e.element);Sn(a,e.element,e);g=(a.b?-1:1)*(d-a.sa);a.b?e.height=a.Pa.S-a.Pa.W-Di(e)-Ei(e):e.width=a.Pa.V-a.Pa.ca-Fi(e)-Gi(e);d=(a.b?-1:
1)*(a.Qa-d)-(a.b?Fi(e)-Gi(e):Di(e)+Ei(e));if(f&&18>d)return a.element.removeChild(e.element),a.k=null,Tn(a,b,c),M(!0);if(!a.b&&e.top<g)return a.element.removeChild(e.element),Tn(a,b,c),M(!0);var l=L("layoutFootnoteInner");a.b?Ji(e,0,d):Ii(e,g,d);e.B=a.B+a.left+Fi(a);e.D=a.D+a.top+Di(a);e.F=a.F;var k=new vi(c);f?(Vn(e),d=M(!0)):0==e.F.length?(Wn(e),d=M(!0)):d=Xn(e);d.then(function(){Yn(e,k).then(function(d){if(f&&d)a.element.removeChild(e.element),Tn(a,b,c),a.k=null,O(l,!0);else{a.b?(a.ia=a.Qa+(e.d+
Fi(e)+Gi(e)),Ji(e,0,e.d)):(a.ia=a.Qa-(e.d+Di(e)+Ei(e)),Ii(e,a.ia-a.sa,e.d));var g;!a.b&&0<e.F.length?g=Xn(e):g=M(d);g.then(function(d){d=new An(b,c,d?d.Oa:null);a.e?a.e.push(d):a.e=[d];O(l,!0)})}})});return N(l)}
function Zn(a,b){var c=L("layoutFootnote"),d=b.A;d.setAttribute("style","");v(d,"display","inline-block");d.textContent="M";var e=d.getBoundingClientRect(),f=a.b?e.left:e.bottom;d.textContent="";bn(a.f,b,"footnote-call",d);d.textContent||d.parentNode.removeChild(d);d={ha:[{ga:b.$,Ia:0,fa:b.fa,ra:null,oa:null}],ea:0,I:!1};e=b.ja;b=b.modify();b.I=!0;Un(a,e,d,f).then(function(){a.k&&a.k.element.parentNode&&a.element.removeChild(a.k.element);Dn(a,f)&&0!=a.w.length&&(b.d=!0);O(c,b)});return N(c)}
function $n(a,b){var c=L("layoutFloat"),d=b.A,e=b.k,f=b.Y,g=b.parent?b.parent.N:"ltr",h=a.f.e,l=b.A.parentNode;"page"===f?Si(h,d,e):(v(d,"float","none"),v(d,"display","inline-block"),v(d,"vertical-align","top"));Ln(a,b).then(function(k){var m=d.getBoundingClientRect(),p=Qn(a,d),m=new re(m.left-p.left,m.top-p.top,m.right+p.right,m.bottom+p.bottom);if("page"===f)Ti(h,b,a.f)?(m=l.ownerDocument.createElement("span"),v(m,"width","0"),v(m,"height","0"),l.appendChild(m),k.A=m,O(c,k)):Vi(h,b,m).then(function(){O(c,
null)});else{e=Pi(e,a.b,g);for(var r=a.G,w=a.Y,p=b.parent;p&&p.e;)p=p.parent;if(p){var q=p.A.ownerDocument.createElement("div");q.style.left="0px";q.style.top="0px";a.b?(q.style.bottom="0px",q.style.width="1px"):(q.style.right="0px",q.style.height="1px");p.A.appendChild(q);var y=q.getBoundingClientRect(),r=Math.max(a.b?y.top:y.left,r),w=Math.min(a.b?y.bottom:y.right,w);p.A.removeChild(q);q=a.b?m.S-m.W:m.V-m.ca;"left"==e?w=Math.max(w,r+q):r=Math.min(r,w-q);p.A.appendChild(b.A)}q=new re(r,(a.b?-1:1)*
a.sa,w,(a.b?-1:1)*a.Qa);r=m;a.b&&(r=Ie(m));w=a.b?-1:1;r.W<a.Kc*w&&(y=r.S-r.W,r.W=a.Kc*w,r.S=r.W+y);Ne(q,a.ib,r,e);a.b&&(m=new re(-r.S,r.ca,-r.W,r.V));q=Rn(a,d);v(d,"width",m.V-m.ca-q.left-q.right+"px");v(d,"height",m.S-m.W-q.top-q.bottom+"px");v(d,"position","absolute");v(d,"display",b.display);w=null;p&&(p.F?w=p:w=ti(p));w?(q=w.A.ownerDocument.createElement("div"),q.style.position="absolute",w.b?q.style.right="0":q.style.left="0",q.style.top="0",w.A.appendChild(q),p=q.getBoundingClientRect(),w.A.removeChild(q)):
p={left:a.b?a.Qa:a.G,right:a.b?a.sa:a.Y,top:a.b?a.G:a.sa};(w?w.b:a.b)?v(d,"right",p.right-m.V+a.u+"px"):v(d,"left",m.ca-p.left+a.h+"px");v(d,"top",m.W-p.top+a.j+"px");b.u&&(b.u.parentNode.removeChild(b.u),b.u=null);p=a.b?m.ca:m.S;m=a.b?m.V:m.W;Dn(a,p)&&0!=a.w.length?(b=b.modify(),b.d=!0,O(c,b)):(Nn(a),q=new re(a.b?a.Qa:a.G,a.b?a.G:a.sa,a.b?a.sa:a.Y,a.b?a.Y:a.Qa),a.b&&(q=Ie(q)),Oe(q,a.ib,r,e),On(a),"left"==e?a.Lc=p:a.Mc=p,a.Kc=m,ao(a,p),O(c,k))}});return N(c)}
function bo(a,b){for(var c=a.A,d="";c&&b&&!d&&(1!=c.nodeType||(d=c.style.textAlign,b));c=c.parentNode);if(!b||"justify"==d){var c=a.A,e=c.ownerDocument,d=e.createElement("span");d.style.visibility="hidden";d.textContent=" ########################";d.setAttribute("data-adapt-spec","1");var f=b&&(a.I||1!=c.nodeType)?c.nextSibling:c;if(c=c.parentNode)c.insertBefore(d,f),b||(e=e.createElement("div"),c.insertBefore(e,f),d.style.lineHeight="80px",e.style.marginTop="-80px",e.style.height="0px",e.setAttribute("data-adapt-spec",
"1"))}}function co(a,b,c,d){var e=L("processLineStyling");Bn(d);var f=d.concat([]);d.splice(0,d.length);var g=0,h=b.f;0==h.count&&(h=h.je);qf(function(d){if(h){var e=eo(a,f),m=h.count-g;if(e.length<=m)P(d);else{var p=fo(a,f,e[m-1]);go(a,p,!1,!1).then(function(){g+=m;mn(a.f,p,0).then(function(e){b=e;bo(b,!1);h=b.f;f=[];In(a,b,f).then(function(b){c=b;0<a.f.e.b.length?P(d):sf(d)})})})}}else P(d)}).then(function(){Array.prototype.push.apply(d,f);Bn(d);O(e,c)});return N(e)}
function ho(a,b){for(var c=0,d=0,e=b.length-1;0<=e;e--){var f=b[e];if(!f.I||!f.A||1!=f.A.nodeType)break;f=Qn(a,f.A);f=a.b?-f.left:f.bottom;0<f?c=Math.max(c,f):d=Math.min(d,f)}return c-d}
function io(a,b){var c=L("layoutBreakableBlock"),d=[];In(a,b,d).then(function(e){if(0<a.f.e.b.length)O(c,e);else{var f=d.length-1;if(0>f)O(c,e);else{var f=Pn(a,e,d,f,d[f].ja),g=Dn(a,f);null==e&&(f+=ho(a,d));ao(a,f);var h;b.f?h=co(a,b,e,d):h=M(e);h.then(function(b){0<d.length&&(a.w.push(new xn(d,d[0].j)),g&&(2!=d.length&&0<a.w.length||d[0].$!=d[1].$||!vn[d[0].$.localName])&&b&&(b=b.modify(),b.d=!0));O(c,b)})}}});return N(c)}
function fo(a,b,c){Bn(b);for(var d=0,e=b[0].ja,f=d,g=b.length-1,h=b[g].ja,l;e<h;){l=e+Math.ceil((h-e)/2);for(var f=d,k=g;f<k;){var m=f+Math.ceil((k-f)/2);b[m].ja>l?k=m-1:f=m}k=Pn(a,null,b,f,l);if(a.b?k<c:k>c){for(h=l-1;b[f].ja==l;)f--;g=f}else ao(a,k),e=l,d=f}a=b[f];b=a.A;1!=b.nodeType&&(a.I?a.ea=b.length:(e-=a.ja,c=b.data,173==c.charCodeAt(e)?(b.replaceData(e,c.length-e,"-"),e++):(d=c.charAt(e),e++,f=c.charAt(e),b.replaceData(e,c.length-e,Pa(d)&&Pa(f)?"-":"")),0<e&&(a=a.modify(),a.ea+=e,a.h=null)));
return a}
function eo(a,b){for(var c=[],d=b[0].A,e=b[b.length-1].A,f=[],g=d.ownerDocument.createRange(),h=!1,l=null,k=!1,m=!0;m;){var p=!0;do{var r=null;d==e&&(m=!1);1!=d.nodeType?(k||(g.setStartBefore(d),k=!0),l=d):h?h=!1:d.getAttribute("data-adapt-spec")?p=!k:r=d.firstChild;r||(r=d.nextSibling,r||(h=!0,r=d.parentNode));d=r}while(p&&m);if(k){g.setEndAfter(l);k=qn(g);for(p=0;p<k.length;p++)f.push(k[p]);k=!1}}f.sort(a.b?ii:gi);l=d=h=g=e=0;for(m=a.b?-1:1;;){if(l<f.length&&(k=f[l],p=1,0<d&&(p=Math.max(a.b?k.right-
k.left:k.bottom-k.top,1),p=m*(a.b?k.right:k.top)<m*e?m*((a.b?k.left:k.bottom)-e)/p:m*(a.b?k.left:k.bottom)>m*g?m*(g-(a.b?k.right:k.top))/p:1),0==d||.6<=p||.2<=p&&(a.b?k.top:k.left)>=h-1)){h=a.b?k.bottom:k.right;a.b?(e=0==d?k.right:Math.max(e,k.right),g=0==d?k.left:Math.min(g,k.left)):(e=0==d?k.top:Math.min(e,k.top),g=0==d?k.bottom:Math.max(g,k.bottom));d++;l++;continue}0<d&&(c.push(g),d=0);if(l>=f.length)break}c.sort(Ta);a.b&&c.reverse();return c}
function jo(a,b){if(!a.e)return M(!0);for(var c=!1,d=a.e.length-1;0<=d;--d){var e=a.e[d];if(e.ja<=b)break;a.e.pop();e.b!==e.d&&(c=!0)}if(!c)return M(!0);var f=L("clearFootnotes"),g=a.d+a.sa,h=a.e;a.k=null;a.e=null;var l=0;pf(function(){for(;l<h.length;){var b=h[l++],b=Un(a,b.ja,b.d,g);if(b.Ca())return b}return M(!1)}).then(function(){O(f,!0)});return N(f)}
function yn(a,b,c){for(var d=b.e,e=d[0];e.parent&&e.e;)e=e.parent;var f;c?f=c=1:(c=Math.max((e.g.widows||2)-0,1),f=Math.max((e.g.orphans||2)-0,1));var g=0;ui(e,function(b){if("clone"===b.g["box-decoration-break"]){var c=rn(a.qa,b.A),d=new te;c&&(d.left=Z(c.borderLeftWidth)+Z(c.paddingLeft),d.top=Z(c.borderTopWidth)+Z(c.paddingTop),d.right=Z(c.borderRightWidth)+Z(c.paddingRight),d.bottom=Z(c.borderBottomWidth)+Z(c.paddingBottom));g+=b.b?-d.left:d.bottom}});var h=eo(a,d),l=a.ia-g,d=Sa(h.length,function(b){return a.b?
h[b]<l:h[b]>l}),d=Math.min(h.length-c,d);if(d<f)return null;l=h[d-1];if(b=fo(a,b.e,l))a.d=(a.b?-1:1)*(l-a.sa);return b}function go(a,b,c,d){c=c||null!=b.A&&1==b.A.nodeType&&!b.I;var e=b,f=c;do{var g=e.A.parentNode;if(!g)break;var h=g,l=e.A;if(h)for(var k=void 0;(k=h.lastChild)!=l;)h.removeChild(k);f&&(g.removeChild(e.A),f=!1);e=e.parent}while(e);d&&(bo(b,!0),on(c?b:b.parent));return jo(a,b.ja)}
function ko(a,b,c){var d=L("findAcceptableBreak"),e=null,f=0,g=0;do for(var f=g,g=Number.MAX_VALUE,h=a.w.length-1;0<=h&&!e;--h){var e=a.w[h].d(a,f),l=a.w[h].b();l>f&&(g=Math.min(g,l))}while(g>f&&!e);var k=!1;if(!e){u.b("Could not find any page breaks?!!");if(a.Hd)return lo(a,b).then(function(b){b?(b=b.modify(),b.d=!1,go(a,b,k,!0).then(function(){O(d,b)})):O(d,b)}),N(d);e=c;k=!0}go(a,e,k,!0).then(function(){O(d,e)});return N(d)}
function mo(a){a=a.toString();return""==a||"auto"==a||!!a.match(/^0+(.0*)?[^0-9]/)}function no(a,b,c,d,e){if(!b)return!1;var f=wn(b,0,a.b),g=Dn(a,f);c&&(f+=ho(a,c));ao(a,f);if(d||!g)b=new zn(pi(b),e,g,a.d),a.w.push(b);return g}
function oo(a,b){if(b.A.parentNode){var c=Qn(a,b.A),d=b.A.ownerDocument.createElement("div");a.b?(d.style.bottom="0px",d.style.width="1px",d.style.marginRight=c.right+"px"):(d.style.right="0px",d.style.height="1px",d.style.marginTop=c.top+"px");b.A.parentNode.insertBefore(d,b.A);var e=d.getBoundingClientRect(),e=a.b?e.right:e.top,f=a.b?-1:1,g;switch(b.l){case "left":g=a.Lc;break;case "right":g=a.Mc;break;default:g=f*Math.max(a.Mc*f,a.Lc*f)}e*f>=g*f?b.A.parentNode.removeChild(d):(e=Math.max(1,(g-e)*
f),a.b?d.style.width=e+"px":d.style.height=e+"px",e=d.getBoundingClientRect(),e=a.b?e.left:e.bottom,a.b?(g=e+c.right-g,0<g==0<=c.right&&(g+=c.right),d.style.marginLeft=g+"px"):(g-=e+c.top,0<g==0<=c.top&&(g+=c.top),d.style.marginBottom=g+"px"),b.u=d)}}
function po(a,b,c){function d(){b=k[0]||b;b.A.parentNode.removeChild(b.A);e.g=h}var e=a,f=L("skipEdges"),g=c&&b&&b.I,h=null,l=null,k=[],m=[],p=!1;qf(function(a){for(;b;){do if(b.A){if(b.e&&1!=b.A.nodeType){if(ci(b.A,b.w))break;if(!b.I){!c&&ql[h]?d():no(e,l,null,!0,h)?(b=(l||b).modify(),b.d=!0):(b=b.modify(),b.h=h);P(a);return}}if(!b.I&&(b.l&&oo(e,b),b.k||b.B)){k.push(pi(b));h=ol(h,b.h);if(!c&&ql[h])d();else if(no(e,l,null,!0,h)||!Jn(e.ab,b))b=(l||b).modify(),b.d=!0;P(a);return}if(1==b.A.nodeType){var f=
b.A.style;if(b.I){if(p){if(!c&&ql[h]){d();P(a);return}k=[];g=c=!1;h=null}p=!1;l=pi(b);m.push(l);h=ol(h,b.D);if(f&&(!mo(f.paddingBottom)||!mo(f.borderBottomWidth))){if(no(e,l,null,!0,h)){b=(l||b).modify();b.d=!0;P(a);return}m=[l];l=null}}else{k.push(pi(b));h=ol(h,b.h);if(!Jn(e.ab,b)){no(e,l,null,!1,h);b=b.modify();b.d=!0;P(a);return}if(vn[b.A.localName]){!c&&ql[h]?d():no(e,l,null,!0,h)&&(b=(l||b).modify(),b.d=!0);P(a);return}!f||mo(f.paddingTop)&&mo(f.borderTopWidth)||(g=!1,m=[]);p=!0}}}while(0);f=
jn(e.f,b,g);if(f.Ca()){f.then(function(c){b=c;sf(a)});return}b=f.get()}no(e,l,m,!1,h)?l&&(b=l.modify(),b.d=!0):ql[h]&&(e.g=h);P(a)}).then(function(){O(f,b)});return N(f)}
function lo(a,b){var c=pi(b),d=L("skipEdges"),e=null,f=!1;qf(function(d){for(;b;){do if(b.A){if(b.e&&1!=b.A.nodeType){if(ci(b.A,b.w))break;if(!b.I){ql[e]&&(a.g=e);P(d);return}}if(!b.I&&(b.k||b.B)){e=ol(e,b.h);ql[e]&&(a.g=e);P(d);return}if(1==b.A.nodeType){var h=b.A.style;if(b.I){if(f){if(ql[e]){a.g=e;P(d);return}e=null}f=!1;e=ol(e,b.D)}else{e=ol(e,b.h);if(vn[b.A.localName]){ql[e]&&(a.g=e);P(d);return}if(h&&(!mo(h.paddingTop)||!mo(h.borderTopWidth))){P(d);return}}f=!0}}while(0);h=jn(a.f,b);if(h.Ca()){h.then(function(a){b=
a;sf(d)});return}b=h.get()}c=null;P(d)}).then(function(){O(d,c)});return N(d)}function Kn(a,b){return"footnote"==b.k?Zn(a,b):$n(a,b)}function qo(a,b,c){var d=L("layoutNext");po(a,b,c).then(function(c){b=c;if(!b||a.g||b.d)O(d,b);else if(b.k)Kn(a,b).ua(d);else{a:if(b.I)c=!0;else{switch(b.$.namespaceURI){case "http://www.w3.org/2000/svg":c=!1;break a}c=!b.B}c?io(a,b).ua(d):Ln(a,b).ua(d)}});return N(d)}
function Wn(a){var b=a.element.ownerDocument.createElement("div");b.style.position="absolute";b.style.top=a.j+"px";b.style.right=a.u+"px";b.style.bottom=a.l+"px";b.style.left=a.h+"px";a.element.appendChild(b);var c=b.getBoundingClientRect();a.element.removeChild(b);var b=a.B+a.left+Fi(a),d=a.D+a.top+Di(a);a.Pa=new re(b,d,b+a.width,d+a.height);a.G=c?a.b?c.top:c.left:0;a.Y=c?a.b?c.bottom:c.right:0;a.sa=c?a.b?c.right:c.top:0;a.Qa=c?a.b?c.left:c.bottom:0;a.Lc=a.sa;a.Mc=a.sa;a.Kc=a.sa;a.ia=a.Qa;c=a.Pa;
b=a.B+a.left+Fi(a);d=a.D+a.top+Di(a);if(a.xb){for(var e=a.xb,f=[],g=0;g<e.b.length;g++){var h=e.b[g];f.push(new se(h.x+b,h.y+d))}b=new xe(f)}else b=Ae(b,d,b+a.width,d+a.height);a.ib=Ke(c,[b],a.F,a.bb,a.b);On(a);a.e=null}function Vn(a){a.wb=[];v(a.element,"width",a.width+"px");v(a.element,"height",a.height+"px");Wn(a);a.d=0;a.qd=!1;a.g=null}function ao(a,b){a.d=Math.max((a.b?-1:1)*(b-a.sa),a.d)}
function ro(a,b){var c=b.b;if(!c)return M(!0);var d=L("layoutOverflownFootnotes"),e=0;pf(function(){for(;e<c.length;){var b=c[e++],b=Un(a,0,b,a.sa);if(b.Ca())return b}return M(!1)}).then(function(){O(d,!0)});return N(d)}
function Yn(a,b,c){a.wb.push(b);if(a.qd)return M(b);var d=L("layout");ro(a,b).then(function(){Fn(a,b.Oa).then(function(b){var f=b;a.w=[];qf(function(d){for(;b;){var h=!0;qo(a,b,c).then(function(l){c=!1;b=l;0<a.f.e.b.length?P(d):a.g?P(d):b&&b.d?ko(a,b,f).then(function(a){b=a;P(d)}):h?h=!1:sf(d)});if(h){h=!1;return}}P(d)}).then(function(){var c=a.k;c&&(a.element.appendChild(c.element),a.b?a.d=this.sa-this.Qa:a.d=c.top+Di(c)+c.d+Ei(c));if(b)if(0<a.f.e.b.length)O(d,null);else{a.qd=!0;c=new vi(ri(b));
if(a.e){for(var f=[],l=0;l<a.e.length;l++){var k=a.e[l].b;k&&f.push(k)}c.b=f.length?f:null}O(d,c)}else O(d,null)})})});return N(d)}function Xn(a){for(var b=a.wb,c=a.element.lastChild;c!=a.pd;){var d=c.previousSibling;a.element===c.parentNode&&Om(c)||a.element.removeChild(c);c=d}Nn(a);Vn(a);var e=L("redoLayout"),f=0,g=null,h=!0;qf(function(c){if(f<b.length){var d=b[f++];Yn(a,d,h).then(function(a){h=!1;a?(g=a,P(c)):sf(c)})}else P(c)}).then(function(){O(e,g)});return N(e)};function so(a,b){this.b=a;this.R=b}function Tm(a,b,c,d){this.b=a;this.e=b;this.g=c;this.d=d;this.f=null}function Sm(a,b){this.b=a;this.d=b}function to(a){var b={};Object.keys(a).forEach(function(c){b[c]=Array.b(a[c])});return b}function uo(a,b){this.Fb=a;this.fc=b;this.cd=null;this.R=this.H=-1}function Pk(a,b,c){b=a.b.D.ld(b,a.d);a.b.h[b]=c}function vo(a){return(a=a.match(/^[^#]*#(.*)$/))?a[1]:null}function wo(a,b){var c=a.b.D.b(wa(b,a.e),a.e);"#"===c.charAt(0)&&(c=c.substring(1));return c}
function uk(a,b,c){return new jc(a.d,function(){var d=a.b.b[b];return c(d&&d.length?d[d.length-1]:null)},"page-counter-"+b)}function wk(a,b,c){return new jc(a.d,function(){return c(a.b.b[b]||[])},"page-counters-"+b)}function xo(a,b,c,d){var e=a.b.h[c];if(!e&&d&&b){d=a.f;if(b){d.k=b;for(b=0;d.k&&(b+=5E3,Il(d,b,0)!==Number.POSITIVE_INFINITY););d.k=null}e=a.b.h[c]}return e||null}
function yk(a,b,c,d){var e=vo(b),f=wo(a,b),g=xo(a,e,f,!1);return g&&g[c]?(b=g[c],new hc(a.g,d(b[b.length-1]||null))):new jc(a.d,function(){if(g=xo(a,e,f,!0)){if(g[c]){var b=g[c];return d(b[b.length-1]||null)}if(b=a.b.g.b[f]?a.b.b:a.b.k[f]||null)return yo(a.b,f),b[c]?(b=b[c],d(b[b.length-1]||null)):d(0);zo(a.b,f,!1);return"??"}zo(a.b,f,!1);return"??"},"target-counter-"+c+"-of-"+b)}
function Ak(a,b,c,d){var e=vo(b),f=wo(a,b);return new jc(a.d,function(){var b=a.b.g.b[f]?a.b.b:a.b.k[f]||null;if(b){yo(a.b,f);var b=b[c]||[],h=xo(a,e,f,!0)[c]||[];return d(b.concat(h))}zo(a.b,f,!1);return"??"},"target-counters-"+c+"-of-"+b)}function Ao(a){this.D=a;this.h={};this.k={};this.b={};this.b.page=[0];this.w={};this.u=[];this.l={};this.g=null;this.j=[];this.e=[];this.B=[];this.d={};this.f={}}function Bo(a,b){var c=a.b.page;c&&c.length?c[c.length-1]=b:a.b.page=[b]}
function Co(a,b,c){a.w=to(a.b);var d,e=b["counter-reset"];e&&(e=e.evaluate(c))&&(d=sg(e,!0));if(d)for(var f in d){var e=a,g=f,h=d[f];e.b[g]?e.b[g].push(h):e.b[g]=[h]}var l;(b=b["counter-increment"])&&(c=b.evaluate(c))&&(l=sg(c,!1));l?"page"in l||(l.page=1):l={page:1};for(var k in l)a.b[k]||(c=a,b=k,c.b[b]?c.b[b].push(0):c.b[b]=[0]),c=a.b[k],c[c.length-1]+=l[k]}function Do(a,b){a.u.push(a.b);a.b=to(b)}
function yo(a,b){var c=a.d[b],d=a.f[b];d||(d=a.f[b]=[]);for(var e=!1,f=0;f<a.e.length;){var g=a.e[f];g.Fb===b?(g.fc=!0,a.e.splice(f,1),c&&(e=c.indexOf(g),0<=e&&c.splice(e,1)),d.push(g),e=!0):f++}e||zo(a,b,!0)}function zo(a,b,c){a.j.some(function(a){return a.Fb===b})||a.j.push(new uo(b,c))}
function Eo(a,b,c){var d=Object.keys(a.g.b);if(0<d.length){var e=to(a.b);d.forEach(function(a){this.k[a]=e;var d=this.l[a];if(d&&d.R<c&&(d=this.f[a])){var f=this.d[a];f||(f=this.d[a]=[]);for(var g;g=d.shift();)g.fc=!1,f.push(g)}this.l[a]={H:b,R:c}},a)}for(var d=a.w,f;f=a.j.shift();){f.cd=d;f.H=b;f.R=c;var g;f.fc?(g=a.f[f.Fb])||(g=a.f[f.Fb]=[]):(g=a.d[f.Fb])||(g=a.d[f.Fb]=[]);g.every(function(a){return!(f===a||a&&f.Fb===a.Fb&&f.fc===a.fc&&f.H===a.H&&f.R===a.R)})&&g.push(f)}a.g=null}
function Fo(a,b){var c=[];Object.keys(b.b).forEach(function(a){(a=this.d[a])&&(c=c.concat(a))},a);c.sort(function(a,b){return a.H-b.H||a.R-b.R});var d=[],e=null;c.forEach(function(a){e&&e.H===a.H&&e.R===a.R?e.xc.push(a):(e={H:a.H,R:a.R,cd:a.cd,xc:[a]},d.push(e))});return d}function Go(a,b){a.B.push(a.e);a.e=b}function Jn(a,b){if(!b||b.I)return!0;var c=b.A;if(!c||1!==c.nodeType)return!0;c=c.getAttribute("id")||c.getAttribute("name");return c&&(a.b.f[c]||a.b.d[c])?(c=a.b.l[c])?a.R>=c.R:!0:!0};function Ho(a,b){this.e(a,"end",b)}function Io(a,b){this.e(a,"start",b)}function Jo(a,b,c){c||(c=this.g.now());var d=this.f[a];d||(d=this.f[a]=[]);var e;for(a=d.length-1;0<=a&&(!(e=d[a])||e[b]);a--)e=null;e||(e={},d.push(e));e[b]=c}function Ko(){}function Lo(a){this.g=a;this.f={};this.registerEndTiming=this.b=this.registerStartTiming=this.d=this.e=Ko}
Lo.prototype.h=function(){var a=this.f,b="";Object.keys(a).forEach(function(c){for(var d=a[c],e=d.length,f=0;f<e;f++){var g=d[f];b+=c;1<e&&(b+="("+f+")");b+=" => start: "+g.start+", end: "+g.end+", duration: "+(g.end-g.start)+"\n"}});u.e(b)};Lo.prototype.j=function(){this.registerEndTiming=this.b=this.registerStartTiming=this.d=this.e=Ko};Lo.prototype.k=function(){this.e=Jo;this.registerStartTiming=this.d=Io;this.registerEndTiming=this.b=Ho};
var Mo={now:Date.now},No,Oo=No=new Lo(window&&window.performance||Mo);Jo.call(Oo,"load_vivliostyle","start",void 0);ba("vivliostyle.profile.profiler",Oo);Lo.prototype.printTimings=Lo.prototype.h;Lo.prototype.disable=Lo.prototype.j;Lo.prototype.enable=Lo.prototype.k;function Po(a,b,c){function d(c){return rn(a,b).getPropertyValue(c)}function e(){v(b,"display","block");v(b,"position","static");return d(X)}function f(){v(b,"display","inline-block");v(q,X,"99999999px");var a=d(X);v(q,X,"");return a}function g(){v(b,"display","inline-block");v(q,X,"0");var a=d(X);v(q,X,"");return a}function h(){var a=e(),b=g(),c=parseFloat(a);if(c<=parseFloat(b))return b;b=f();return c<=parseFloat(b)?a:b}function l(){throw Error("Getting fill-available block size is not implemented");
}var k=b.style.display,m=b.style.position,p=b.style.width,r=b.style.height,w=b.parentNode,q=b.ownerDocument.createElement("div");v(q,"position",m);w.insertBefore(q,b);q.appendChild(b);v(b,"width","auto");v(b,"height","auto");var y=Ha("writing-mode"),y=(y?d(y):null)||d("writing-mode"),S="vertical-rl"===y||"tb-rl"===y||"vertical-lr"===y||"tb-lr"===y,X=S?"height":"width",ga=S?"width":"height",La={};c.forEach(function(a){var c;switch(a){case "fill-available inline size":c=e();break;case "max-content inline size":c=
f();break;case "min-content inline size":c=g();break;case "fit-content inline size":c=h();break;case "fill-available block size":c=l();break;case "max-content block size":case "min-content block size":case "fit-content block size":c=d(ga);break;case "fill-available width":c=S?l():e();break;case "fill-available height":c=S?e():l();break;case "max-content width":c=S?d(ga):f();break;case "max-content height":c=S?f():d(ga);break;case "min-content width":c=S?d(ga):g();break;case "min-content height":c=
S?g():d(ga);break;case "fit-content width":c=S?d(ga):h();break;case "fit-content height":c=S?h():d(ga)}La[a]=parseFloat(c);v(b,"position",m);v(b,"display",k)});v(b,"width",p);v(b,"height",r);w.insertBefore(b,q);w.removeChild(q);return La};function Qo(a){var b=a["writing-mode"],b=b&&b.value;a=(a=a.direction)&&a.value;return b===he||b!==ie&&a!==be?"ltr":"rtl"}
var Ro={a5:{width:new H(148,"mm"),height:new H(210,"mm")},a4:{width:new H(210,"mm"),height:new H(297,"mm")},a3:{width:new H(297,"mm"),height:new H(420,"mm")},b5:{width:new H(176,"mm"),height:new H(250,"mm")},b4:{width:new H(250,"mm"),height:new H(353,"mm")},"jis-b5":{width:new H(182,"mm"),height:new H(257,"mm")},"jis-b4":{width:new H(257,"mm"),height:new H(364,"mm")},letter:{width:new H(8.5,"in"),height:new H(11,"in")},legal:{width:new H(8.5,"in"),height:new H(14,"in")},ledger:{width:new H(11,"in"),
height:new H(17,"in")}},So=new H(.24,"pt"),To=new H(3,"mm"),Uo=new H(10,"mm"),Vo=new H(13,"mm");
function Wo(a){var b={width:me,height:ne,Ab:oe,lb:oe},c=a.size;if(c&&c.value!==wd){var d=c.value;d.Zc()?(c=d.values[0],d=d.values[1]):(c=d,d=null);if(c.$b())b.width=c,b.height=d||c;else if(c=Ro[c.name.toLowerCase()])d&&d===Qd?(b.width=c.height,b.height=c.width):(b.width=c.width,b.height=c.height)}(c=a.marks)&&c.value!==J&&(b.lb=Vo);a=a.bleed;a&&a.value!==wd?a.value&&a.value.$b()&&(b.Ab=a.value):c&&(a=!1,c.value.Zc()?a=c.value.values.some(function(a){return a===Dd}):a=c.value===Dd,a&&(b.Ab=new H(6,
"pt")));return b}function Xo(a,b){var c={},d=a.Ab.C*qc(b,a.Ab.X,!1),e=a.lb.C*qc(b,a.lb.X,!1),f=d+e,g=a.width;c.qb=g===me?(b.T.$a?Math.floor(b.Aa/2)-b.T.Mb:b.Aa)-2*f:g.C*qc(b,g.X,!1);g=a.height;c.pb=g===ne?b.ib-2*f:g.C*qc(b,g.X,!1);c.Ab=d;c.lb=e;c.Rc=f;return c}function Yo(a,b,c){a=a.createElementNS("http://www.w3.org/2000/svg","svg");a.setAttribute("width",b);a.setAttribute("height",c);a.style.position="absolute";return a}
function Zo(a,b,c){a=a.createElementNS("http://www.w3.org/2000/svg",c||"polyline");a.setAttribute("stroke","black");a.setAttribute("stroke-width",b);a.setAttribute("fill","none");return a}var $o={Ge:"top left",He:"top right",ve:"bottom left",we:"bottom right"};
function ap(a,b,c,d,e,f){var g=d;g<=e+2*mc.mm&&(g=e+d/2);var h=Math.max(d,g),l=e+h+c/2,k=Yo(a,l,l),g=[[0,e+d],[d,e+d],[d,e+d-g]];d=g.map(function(a){return[a[1],a[0]]});if("top right"===b||"bottom right"===b)g=g.map(function(a){return[e+h-a[0],a[1]]}),d=d.map(function(a){return[e+h-a[0],a[1]]});if("bottom left"===b||"bottom right"===b)g=g.map(function(a){return[a[0],e+h-a[1]]}),d=d.map(function(a){return[a[0],e+h-a[1]]});l=Zo(a,c);l.setAttribute("points",g.map(function(a){return a.join(",")}).join(" "));
k.appendChild(l);a=Zo(a,c);a.setAttribute("points",d.map(function(a){return a.join(",")}).join(" "));k.appendChild(a);b.split(" ").forEach(function(a){k.style[a]=f+"px"});return k}var bp={Fe:"top",ue:"bottom",Wd:"left",Xd:"right"};
function cp(a,b,c,d,e){var f=2*d,g;"top"===b||"bottom"===b?(g=f,f=d):g=d;var h=Yo(a,g,f),l=Zo(a,c);l.setAttribute("points","0,"+f/2+" "+g+","+f/2);h.appendChild(l);l=Zo(a,c);l.setAttribute("points",g/2+",0 "+g/2+","+f);h.appendChild(l);a=Zo(a,c,"circle");a.setAttribute("cx",g/2);a.setAttribute("cy",f/2);a.setAttribute("r",d/4);h.appendChild(a);var k;switch(b){case "top":k="bottom";break;case "bottom":k="top";break;case "left":k="right";break;case "right":k="left"}Object.keys(bp).forEach(function(a){a=
bp[a];a===b?h.style[a]=e+"px":a!==k&&(h.style[a]="0",h.style["margin-"+a]="auto")});return h}function dp(a,b,c,d){var e=!1,f=!1;if(a=a.marks)a=a.value,a.Zc()?a.values.forEach(function(a){a===Dd?e=!0:a===Ed&&(f=!0)}):a===Dd?e=!0:a===Ed&&(f=!0);if(e||f){var g=c.M,h=g.ownerDocument,l=b.Ab,k=sd(So,d),m=sd(To,d),p=sd(Uo,d);e&&Object.keys($o).forEach(function(a){a=ap(h,$o[a],k,p,l,m);g.appendChild(a)});f&&Object.keys(bp).forEach(function(a){a=cp(h,bp[a],k,p,m);g.appendChild(a)})}}
var ep=function(){var a={width:!0,height:!0,"block-size":!0,"inline-size":!0,margin:!0,padding:!0,border:!0,outline:!0,"outline-width":!0,"outline-style":!0,"outline-color":!0};"left right top bottom before after start end block-start block-end inline-start inline-end".split(" ").forEach(function(b){a["margin-"+b]=!0;a["padding-"+b]=!0;a["border-"+b+"-width"]=!0;a["border-"+b+"-style"]=!0;a["border-"+b+"-color"]=!0});return a}(),fp={"top-left-corner":{Q:1,za:!0,wa:!1,xa:!0,ya:!0,la:null},"top-left":{Q:2,
za:!0,wa:!1,xa:!1,ya:!1,la:"start"},"top-center":{Q:3,za:!0,wa:!1,xa:!1,ya:!1,la:"center"},"top-right":{Q:4,za:!0,wa:!1,xa:!1,ya:!1,la:"end"},"top-right-corner":{Q:5,za:!0,wa:!1,xa:!1,ya:!0,la:null},"right-top":{Q:6,za:!1,wa:!1,xa:!1,ya:!0,la:"start"},"right-middle":{Q:7,za:!1,wa:!1,xa:!1,ya:!0,la:"center"},"right-bottom":{Q:8,za:!1,wa:!1,xa:!1,ya:!0,la:"end"},"bottom-right-corner":{Q:9,za:!1,wa:!0,xa:!1,ya:!0,la:null},"bottom-right":{Q:10,za:!1,wa:!0,xa:!1,ya:!1,la:"end"},"bottom-center":{Q:11,za:!1,
wa:!0,xa:!1,ya:!1,la:"center"},"bottom-left":{Q:12,za:!1,wa:!0,xa:!1,ya:!1,la:"start"},"bottom-left-corner":{Q:13,za:!1,wa:!0,xa:!0,ya:!1,la:null},"left-bottom":{Q:14,za:!1,wa:!1,xa:!0,ya:!1,la:"end"},"left-middle":{Q:15,za:!1,wa:!1,xa:!0,ya:!1,la:"center"},"left-top":{Q:16,za:!1,wa:!1,xa:!0,ya:!1,la:"start"}},gp=Object.keys(fp).sort(function(a,b){return fp[a].Q-fp[b].Q});
function hp(a,b,c){Ul.call(this,a,null,"vivliostyle-page-rule-master",[],b,null,0);a=Wo(c);new ip(this.d,this,c,a);this.k={};jp(this,c);this.b.position=new U(Yd,0);this.b.width=new U(a.width,0);this.b.height=new U(a.height,0);for(var d in c)ep[d]||"background-clip"===d||(this.b[d]=c[d])}t(hp,Ul);function jp(a,b){var c=b._marginBoxes;c&&gp.forEach(function(d){c[d]&&(a.k[d]=new kp(a.d,a,d,b))})}hp.prototype.f=function(a){return new lp(a,this)};
function ip(a,b,c,d){Yl.call(this,a,null,null,[],b);this.l=d;this.b["z-index"]=new U(new od(0),0);this.b["flow-from"]=new U(G("body"),0);this.b.position=new U(td,0);this.b.overflow=new U(je,0);for(var e in ep)ep.hasOwnProperty(e)&&(this.b[e]=c[e])}t(ip,Yl);ip.prototype.f=function(a){return new mp(a,this)};
function kp(a,b,c,d){Yl.call(this,a,null,null,[],b);this.j=c;a=d._marginBoxes[this.j];for(var e in d)if(b=d[e],c=a[e],$i[e]||c&&c.value===Ld)this.b[e]=b;for(e in a)Object.prototype.hasOwnProperty.call(a,e)&&(b=a[e])&&b.value!==Ld&&(this.b[e]=b)}t(kp,Yl);kp.prototype.f=function(a){return new np(a,this)};function lp(a,b){Vl.call(this,a,b);this.j=null;this.ma={}}t(lp,Vl);
lp.prototype.h=function(a,b){var c=this.D,d;for(d in b)if(Object.prototype.hasOwnProperty.call(b,d))switch(d){case "writing-mode":case "direction":c[d]=b[d]}Vl.prototype.h.call(this,a,b)};lp.prototype.Wc=function(){var a=this.style;a.left=oe;a["margin-left"]=oe;a["border-left-width"]=oe;a["padding-left"]=oe;a["padding-right"]=oe;a["border-right-width"]=oe;a["margin-right"]=oe;a.right=oe};
lp.prototype.Xc=function(){var a=this.style;a.top=oe;a["margin-top"]=oe;a["border-top-width"]=oe;a["padding-top"]=oe;a["padding-bottom"]=oe;a["border-bottom-width"]=oe;a["margin-bottom"]=oe;a.bottom=oe};lp.prototype.O=function(a,b,c){b=b.u;var d={start:this.j.marginLeft,end:this.j.marginRight,da:this.j.Jb},e={start:this.j.marginTop,end:this.j.marginBottom,da:this.j.Ib};op(this,b.top,!0,d,a,c);op(this,b.bottom,!0,d,a,c);op(this,b.left,!1,e,a,c);op(this,b.right,!1,e,a,c)};
function pp(a,b,c,d,e){this.M=a;this.l=e;this.g=c;this.k=!W(d,b[c?"width":"height"],new Sc(d,0,"px"));this.h=null}pp.prototype.b=function(){return this.k};function qp(a){a.h||(a.h=Po(a.l,a.M.element,a.g?["max-content width","min-content width"]:["max-content height","min-content height"]));return a.h}pp.prototype.e=function(){var a=qp(this);return this.g?Fi(this.M)+a["max-content width"]+Gi(this.M):Di(this.M)+a["max-content height"]+Ei(this.M)};
pp.prototype.f=function(){var a=qp(this);return this.g?Fi(this.M)+a["min-content width"]+Gi(this.M):Di(this.M)+a["min-content height"]+Ei(this.M)};pp.prototype.d=function(){return this.g?Fi(this.M)+this.M.width+Gi(this.M):Di(this.M)+this.M.height+Ei(this.M)};function rp(a){this.g=a}rp.prototype.b=function(){return this.g.some(function(a){return a.b()})};rp.prototype.e=function(){var a=this.g.map(function(a){return a.e()});return Math.max.apply(null,a)*a.length};
rp.prototype.f=function(){var a=this.g.map(function(a){return a.f()});return Math.max.apply(null,a)*a.length};rp.prototype.d=function(){var a=this.g.map(function(a){return a.d()});return Math.max.apply(null,a)*a.length};function sp(a,b,c,d,e,f){pp.call(this,a,b,c,d,e);this.j=f}t(sp,pp);sp.prototype.b=function(){return!1};sp.prototype.e=function(){return this.d()};sp.prototype.f=function(){return this.d()};sp.prototype.d=function(){return this.g?Fi(this.M)+this.j+Gi(this.M):Di(this.M)+this.j+Ei(this.M)};
function op(a,b,c,d,e,f){var g=a.d.d,h={},l={},k={},m;for(m in b){var p=fp[m];if(p){var r=b[m],w=a.ma[m],q=new pp(r,w.style,c,g,f);h[p.la]=r;l[p.la]=w;k[p.la]=q}}a=d.start.evaluate(e);d.end.evaluate(e);b=d.da.evaluate(e);var y=tp(k,b),S=!1,X={};Object.keys(h).forEach(function(a){var b=W(g,l[a].style[c?"max-width":"max-height"],d.da);b&&(b=b.evaluate(e),y[a]>b&&(b=k[a]=new sp(h[a],l[a].style,c,g,f,b),X[a]=b.d(),S=!0))});S&&(y=tp(k,b),S=!1,["start","center","end"].forEach(function(a){y[a]=X[a]||y[a]}));
var ga={};Object.keys(h).forEach(function(a){var b=W(g,l[a].style[c?"min-width":"min-height"],d.da);b&&(b=b.evaluate(e),y[a]<b&&(b=k[a]=new sp(h[a],l[a].style,c,g,f,b),ga[a]=b.d(),S=!0))});S&&(y=tp(k,b),["start","center","end"].forEach(function(a){y[a]=ga[a]||y[a]}));var La=a+b,ma=a+(a+b);["start","center","end"].forEach(function(a){var b=y[a];if(b){var d=h[a],e=0;switch(a){case "start":e=c?d.left:d.top;break;case "center":e=(ma-b)/2;break;case "end":e=La-b}c?Ji(d,e,b-Fi(d)-Gi(d)):Ii(d,e,b-Di(d)-
Ei(d))}})}function tp(a,b){var c=a.start,d=a.center,e=a.end,f={};if(d){var g=[c,e].filter(function(a){return a}),g=up(d,g.length?new rp(g):null,b);g.Wa&&(f.center=g.Wa);d=g.Wa||d.d();d=(b-d)/2;c&&c.b()&&(f.start=d);e&&e.b()&&(f.end=d)}else c=up(c,e,b),c.Wa&&(f.start=c.Wa),c.nc&&(f.end=c.nc);return f}
function up(a,b,c){var d={Wa:null,nc:null};if(a&&b)if(a.b()&&b.b()){var e=a.e(),f=b.e();0<e&&0<f?(f=e+f,f<c?d.Wa=c*e/f:(a=a.f(),b=b.f(),b=a+b,b<c?d.Wa=a+(c-b)*(e-a)/(f-b):0<b&&(d.Wa=c*a/b)),0<d.Wa&&(d.nc=c-d.Wa)):0<e?d.Wa=c:0<f&&(d.nc=c)}else a.b()?d.Wa=Math.max(c-b.d(),0):b.b()&&(d.nc=Math.max(c-a.d(),0));else a?a.b()&&(d.Wa=c):b&&b.b()&&(d.nc=c);return d}lp.prototype.rb=function(a,b,c,d,e){lp.Vd.rb.call(this,a,b,c,d,e);b.element.setAttribute("data-vivliostyle-page-box",!0)};
function mp(a,b){Zl.call(this,a,b);this.marginLeft=this.marginBottom=this.marginRight=this.marginTop=this.Ib=this.Jb=null}t(mp,Zl);
mp.prototype.h=function(a,b){var c=this.D,d;for(d in b)Object.prototype.hasOwnProperty.call(b,d)&&(d.match(/^column.*$/)||d.match(/^background-/))&&(c[d]=b[d]);Zl.prototype.h.call(this,a,b);d=this.e;c={Jb:this.Jb,Ib:this.Ib,marginTop:this.marginTop,marginRight:this.marginRight,marginBottom:this.marginBottom,marginLeft:this.marginLeft};d.j=c;d=d.style;d.width=new I(c.Jb);d.height=new I(c.Ib);d["padding-left"]=new I(c.marginLeft);d["padding-right"]=new I(c.marginRight);d["padding-top"]=new I(c.marginTop);
d["padding-bottom"]=new I(c.marginBottom)};mp.prototype.Wc=function(){var a=vp(this,{start:"left",end:"right",da:"width"});this.Jb=a.Id;this.marginLeft=a.Rd;this.marginRight=a.Qd};mp.prototype.Xc=function(){var a=vp(this,{start:"top",end:"bottom",da:"height"});this.Ib=a.Id;this.marginTop=a.Rd;this.marginBottom=a.Qd};
function vp(a,b){var c=a.style,d=a.d.d,e=b.start,f=b.end,g=b.da,h=a.d.l[g].ka(d,null),l=W(d,c[g],h),k=W(d,c["margin-"+e],h),m=W(d,c["margin-"+f],h),p=$l(d,c["padding-"+e],h),r=$l(d,c["padding-"+f],h),w=bm(d,c["border-"+e+"-width"],c["border-"+e+"-style"],h),q=bm(d,c["border-"+f+"-width"],c["border-"+f+"-style"],h),y=D(d,h,C(d,C(d,w,p),C(d,q,r)));l?(y=D(d,y,l),k||m?k?m=D(d,y,k):k=D(d,y,m):m=k=$c(d,y,new hc(d,.5))):(k||(k=d.b),m||(m=d.b),l=D(d,y,C(d,k,m)));c[e]=new I(k);c[f]=new I(m);c["margin-"+e]=
oe;c["margin-"+f]=oe;c["padding-"+e]=new I(p);c["padding-"+f]=new I(r);c["border-"+e+"-width"]=new I(w);c["border-"+f+"-width"]=new I(q);c[g]=new I(l);c["max-"+g]=new I(l);return{Id:D(d,h,C(d,k,m)),Rd:k,Qd:m}}mp.prototype.rb=function(a,b,c,d,e){Zl.prototype.rb.call(this,a,b,c,d,e);c.w=b.element};function np(a,b){Zl.call(this,a,b);var c=b.j;this.j=fp[c];a.ma[c]=this;this.qa=!0}t(np,Zl);n=np.prototype;
n.rb=function(a,b,c,d,e){var f=b.element;v(f,"display","flex");var g=lm(this,a,"vertical-align"),h=null;g===G("middle")?h="center":g===G("top")?h="flex-start":g===G("bottom")&&(h="flex-end");h&&(v(f,"flex-flow",this.b?"row":"column"),v(f,"justify-content",h));Zl.prototype.rb.call(this,a,b,c,d,e)};
n.la=function(a,b){var c=this.style,d=this.d.d,e=a.start,f=a.end,g="left"===e,h=g?b.Jb:b.Ib,l=W(d,c[a.da],h),g=g?b.marginLeft:b.marginTop;if("start"===this.j.la)c[e]=new I(g);else if(l){var k=$l(d,c["margin-"+e],h),m=$l(d,c["margin-"+f],h),p=$l(d,c["padding-"+e],h),r=$l(d,c["padding-"+f],h),w=bm(d,c["border-"+e+"-width"],c["border-"+e+"-style"],h),f=bm(d,c["border-"+f+"-width"],c["border-"+f+"-style"],h),l=C(d,l,C(d,C(d,p,r),C(d,C(d,w,f),C(d,k,m))));switch(this.j.la){case "center":c[e]=new I(C(d,
g,ad(d,D(d,h,l),new hc(d,2))));break;case "end":c[e]=new I(D(d,C(d,g,h),l))}}};
function wp(a,b,c){function d(a){if(y)return y;y={da:q?q.evaluate(a):null,Ma:l?l.evaluate(a):null,Na:k?k.evaluate(a):null};var b=h.evaluate(a),c=0;[r,m,p,w].forEach(function(b){b&&(c+=b.evaluate(a))});(null===y.Ma||null===y.Na)&&c+y.da+y.Ma+y.Na>b&&(null===y.Ma&&(y.Ma=0),null===y.Na&&(y.Me=0));null!==y.da&&null!==y.Ma&&null!==y.Na&&(y.Na=null);null===y.da&&null!==y.Ma&&null!==y.Na?y.da=b-c-y.Ma-y.Na:null!==y.da&&null===y.Ma&&null!==y.Na?y.Ma=b-c-y.da-y.Na:null!==y.da&&null!==y.Ma&&null===y.Na?y.Na=
b-c-y.da-y.Ma:null===y.da?(y.Ma=y.Na=0,y.da=b-c):y.Ma=y.Na=(b-c-y.da)/2;return y}var e=a.style;a=a.d.d;var f=b.Yc,g=b.bd;b=b.da;var h=c["margin"+g.charAt(0).toUpperCase()+g.substring(1)],l=am(a,e["margin-"+f],h),k=am(a,e["margin-"+g],h),m=$l(a,e["padding-"+f],h),p=$l(a,e["padding-"+g],h),r=bm(a,e["border-"+f+"-width"],e["border-"+f+"-style"],h),w=bm(a,e["border-"+g+"-width"],e["border-"+g+"-style"],h),q=W(a,e[b],h),y=null;e[b]=new I(new jc(a,function(){var a=d(this).da;return null===a?0:a},b));e["margin-"+
f]=new I(new jc(a,function(){var a=d(this).Ma;return null===a?0:a},"margin-"+f));e["margin-"+g]=new I(new jc(a,function(){var a=d(this).Na;return null===a?0:a},"margin-"+g));"left"===f?e.left=new I(C(a,c.marginLeft,c.Jb)):"top"===f&&(e.top=new I(C(a,c.marginTop,c.Ib)))}n.Wc=function(){var a=this.e.j;this.j.xa?wp(this,{Yc:"right",bd:"left",da:"width"},a):this.j.ya?wp(this,{Yc:"left",bd:"right",da:"width"},a):this.la({start:"left",end:"right",da:"width"},a)};
n.Xc=function(){var a=this.e.j;this.j.za?wp(this,{Yc:"bottom",bd:"top",da:"height"},a):this.j.wa?wp(this,{Yc:"top",bd:"bottom",da:"height"},a):this.la({start:"top",end:"bottom",da:"height"},a)};n.uc=function(a,b,c,d,e,f,g){Zl.prototype.uc.call(this,a,b,c,d,e,f,g);a=c.u;c=this.d.j;d=this.j;d.xa||d.ya?d.za||d.wa||(d.xa?a.left[c]=b:d.ya&&(a.right[c]=b)):d.za?a.top[c]=b:d.wa&&(a.bottom[c]=b)};
function xp(a,b,c,d,e){this.b=a;this.h=b;this.f=c;this.d=d;this.e=e;this.g={};a=this.h;b=new Tc(a,"page-number");b=new Lc(a,new Rc(a,b,new hc(a,2)),a.b);c=new Bc(a,b);a.values["recto-page"]=c;a.values["verso-page"]=b;"ltr"===Qo(this.e)?(a.values["left-page"]=b,b=new Bc(a,b),a.values["right-page"]=b):(c=new Bc(a,b),a.values["left-page"]=c,a.values["right-page"]=b)}function yp(a){var b={};Hk(a.b,[],"",b);a.b.pop();return b}
function zp(a,b){var c=[],d;for(d in b)if(Object.prototype.hasOwnProperty.call(b,d)){var e=b[d],f;f=e instanceof U?e.value+"":zp(a,e);c.push(d+f+(e.Ha||""))}return c.sort().join("^")}function Ap(a,b,c){c=c.clone({sb:"vivliostyle-page-rule-master"});var d=c.b,e=b.size;if(e){var f=Wo(b),e=e.Ha;d.width=mj(a.d,d.width,new U(f.width,e));d.height=mj(a.d,d.height,new U(f.height,e))}["counter-reset","counter-increment"].forEach(function(a){d[a]&&(b[a]=d[a])});c=c.f(a.f);c.h(a.b,a.e);zm(c,a.d);return c}
function Bp(a){this.b=null;this.f=a}t(Bp,V);Bp.prototype.apply=function(a){a.O===this.f&&this.b.apply(a)};Bp.prototype.d=function(){return 3};Bp.prototype.e=function(a){this.b&&Bj(a.bc,this.f,this.b);return!0};function Cp(a){this.b=null;this.f=a}t(Cp,V);Cp.prototype.apply=function(a){1===(new Tc(this.f,"page-number")).evaluate(a.h)&&this.b.apply(a)};Cp.prototype.d=function(){return 2};function Dp(a){this.b=null;this.f=a}t(Dp,V);
Dp.prototype.apply=function(a){(new Tc(this.f,"left-page")).evaluate(a.h)&&this.b.apply(a)};Dp.prototype.d=function(){return 1};function Ep(a){this.b=null;this.f=a}t(Ep,V);Ep.prototype.apply=function(a){(new Tc(this.f,"right-page")).evaluate(a.h)&&this.b.apply(a)};Ep.prototype.d=function(){return 1};function Fp(a){this.b=null;this.f=a}t(Fp,V);Fp.prototype.apply=function(a){(new Tc(this.f,"recto-page")).evaluate(a.h)&&this.b.apply(a)};Fp.prototype.d=function(){return 1};
function Gp(a){this.b=null;this.f=a}t(Gp,V);Gp.prototype.apply=function(a){(new Tc(this.f,"verso-page")).evaluate(a.h)&&this.b.apply(a)};Gp.prototype.d=function(){return 1};function Hp(a,b){zj.call(this,a,b,null,null)}t(Hp,zj);Hp.prototype.apply=function(a){var b=a.h,c=a.u,d=this.style;a=this.P;sj(b,c,d,a,null,null);if(d=d._marginBoxes){var c=qj(c,"_marginBoxes"),e;for(e in d)if(d.hasOwnProperty(e)){var f=c[e];f||(f={},c[e]=f);sj(b,f,d[e],a,null,null)}}};
function Ip(a,b,c,d,e){Sk.call(this,a,b,null,c,null,d,!1);this.G=e;this.B=[];this.e="";this.u=[]}t(Ip,Sk);n=Ip.prototype;n.Ob=function(){this.gb()};n.jb=function(a,b){if(this.e=b)this.b.push(new Bp(b)),this.P+=65536};
n.cc=function(a,b){b&&Jf(this,"E_INVALID_PAGE_SELECTOR :"+a+"("+b.join("")+")");this.u.push(":"+a);switch(a.toLowerCase()){case "first":this.b.push(new Cp(this.d));this.P+=256;break;case "left":this.b.push(new Dp(this.d));this.P+=1;break;case "right":this.b.push(new Ep(this.d));this.P+=1;break;case "recto":this.b.push(new Fp(this.d));this.P+=1;break;case "verso":this.b.push(new Gp(this.d));this.P+=1;break;default:Jf(this,"E_INVALID_PAGE_SELECTOR :"+a)}};
function Jp(a){var b;a.e||a.u.length?b=[a.e].concat(a.u.sort()):b=null;a.B.push({Cd:b,P:a.P});a.e="";a.u=[]}n.Lb=function(){Jp(this);Sk.prototype.Lb.call(this)};n.pa=function(){Jp(this);Sk.prototype.pa.call(this)};
n.fb=function(a,b,c){if("bleed"!==a&&"marks"!==a||this.B.some(function(a){return null===a.Cd})){Sk.prototype.fb.call(this,a,b,c);var d=this.h[a],e=this.G;if("bleed"===a||"marks"===a)e[""]||(e[""]={}),Object.keys(e).forEach(function(b){pj(e[b],a,d)});else if("size"===a){var f=e[""];this.B.forEach(function(b){var c=new U(d.value,d.Ha+b.P);b=b.Cd?b.Cd.join(""):"";var l=e[b];l?(c=(b=l[a])?mj(null,c,b):c,pj(l,a,c)):(l=e[b]={},pj(l,a,c),f&&["bleed","marks"].forEach(function(a){f[a]&&pj(l,a,f[a])},this))},
this)}}};n.Nd=function(a){Bj(this.g.bc,"*",a)};n.Pd=function(a){return new Hp(this.h,a)};n.jd=function(a){var b=qj(this.h,"_marginBoxes"),c=b[a];c||(c={},b[a]=c);Ff(this.ba,new Kp(this.d,this.ba,this.k,c))};function Kp(a,b,c,d){Gf.call(this,a,b,!1);this.e=c;this.b=d}t(Kp,Hf);Kp.prototype.eb=function(a,b,c){gh(this.e,a,b,c,this)};Kp.prototype.Zb=function(a,b){If(this,"E_INVALID_PROPERTY_VALUE "+a+": "+b.toString())};Kp.prototype.Hc=function(a,b){If(this,"E_INVALID_PROPERTY "+a+": "+b.toString())};
Kp.prototype.fb=function(a,b,c){pj(this.b,a,new U(b,c?Cf(this):Df(this)))};var Lp=new yf(function(){var a=L("uaStylesheetBase");hh.get().then(function(b){var c=wa("user-agent-base.css",va);b=new Sk(null,null,null,null,null,b,!0);b.Pb("UA");Rk=b.g;hg(c,b,null,null).ua(a)});return N(a)},"uaStylesheetBaseFetcher");
function Mp(a,b,c,d,e,f,g,h,l,k){this.h=a;this.d=b;this.b=c;this.e=d;this.B=e;this.g=f;this.l=a.F;this.u=g;this.f=h;this.k=l;this.w=k;this.j=a.h;lc(this.b,function(a){var b=this.b,c;c=(c=b.b[a])?(c=c.b[0])?c.b:null:null;var d;d=b.b[a];if(d=Np(this,d?d.d:"any"))d=(a=b.b[a])?0<a.b.length&&a.b[0].b.d<=this.l:!1;return d&&!!c&&!Op(this,c)});kc(this.b,new jc(this.b,function(){return this.ma+this.b.page},"page-number"))}
function Pp(a,b,c,d){if(a.k.length){var e=new oc(0,b,c,d);a=a.k;for(var f={},g=0;g<a.length;g++)sj(e,f,a[g],0,null,null);g=f.width;a=f.height;var f=f["text-zoom"],h=1;if(g&&a||f){var l=mc.em;(f?f.evaluate(e,"text-zoom"):null)===$d&&(h=l/d,d=l,b*=h,c*=h);if(g&&a&&(g=sd(g.evaluate(e,"width"),e),e=sd(a.evaluate(e,"height"),e),0<g&&0<e))return{width:g,height:e,fontSize:d}}}return{width:b,height:c,fontSize:d}}
function Qp(a,b,c,d,e,f,g,h,l,k,m){oc.call(this,0,d.width,d.height,d.fontSize);this.style=a;this.aa=b;this.lang=b.lang||c;this.viewport=d;this.g={body:!0};this.e=e;this.k=this.b=this.B=this.d=this.u=null;this.l=0;this.bb=f;this.h=new oh(this.style.l);this.ia={};this.N=null;this.f=m;this.G={};this.Y=null;this.Ja=g;this.ab=h;this.ma=l;this.Pa=k;for(var p in a.f)(b=a.f[p]["flow-consume"])&&(b.evaluate(this,"flow-consume")==ud?this.g[p]=!0:delete this.g[p]);this.qa={}}t(Qp,oc);
function Rp(a){var b=L("StyleInstance.init"),c=new Sm(a.f,a.aa.url),d=new Tm(a.f,a.aa.url,a.style.d,a.style.b);a.d=new wl(a.aa,a.style.e,a.style.d,a,a.g,a.style.j,c,d);d.f=a.d;Kl(a.d,a);a.B={};a.B[a.aa.url]=a.d;var e=Hl(a.d);a.Y=Qo(e);a.u=new Am(a.style.B);c=new Ek(a.style.e,a,c,d);a.u.h(c,e);zm(a.u,a);a.N=new xp(c,a.style.b,a.u,a,e);e=[];for(c=0;c<a.style.g.length;c++)if(d=a.style.g[c],!d.L||d.L.evaluate(a))d=lh(d.Cb,a),d=new mh(d),e.push(d);uh(a.bb,e,a.h).ua(b);var f=a.style.w;Object.keys(f).forEach(function(a){var b=
Xo(Wo(f[a]),this);this.qa[a]={width:b.qb+2*b.Rc,height:b.pb+2*b.Rc}},a);return N(b)}function Ll(a,b,c){if(a=a.b)a.e[b.b]||(a.e[b.b]=c),c=a.b[b.b],c||(c=new yi,a.b[b.b]=c),c.b.push(new xi(new vi({ha:[{ga:b.element,Ia:0,fa:null,ra:null,oa:null}],ea:0,I:!1}),b))}function Sp(a,b){for(var c=Number.POSITIVE_INFINITY,d=0;d<b.b.length;d++){for(var e=b.b[d].d.Oa,f=e.ha[0].ga,g=e.ea,h=e.I,l=0;f.ownerDocument!=a.aa.b;)l++,f=e.ha[l].ga,h=!1,g=0;e=zh(a.aa,f,g,h);e<c&&(c=e)}return c}
function Tp(a,b,c){if(!b)return 0;var d=Number.POSITIVE_INFINITY,e;for(e in a.g){var f=b.b[e];if(!(c||f&&0!=f.b.length)&&a.b){f=a.d;f.D=e;for(var g=0;null!=f.D&&(g+=5E3,Il(f,g,0)!=Number.POSITIVE_INFINITY););f=a.b.b[e];b!=a.b&&f&&(f=f.clone(),b.b[e]=f)}f&&(f=Sp(a,f),f<d&&(d=f))}return d}function Np(a,b){switch(b){case "left":case "right":case "recto":case "verso":return(new Tc(a.style.b,b+"-page")).evaluate(a);default:return!0}}
function Up(a,b){var c=a.b,d=Tp(a,c);if(d==Number.POSITIVE_INFINITY)return null;for(var e=a.u.children,f,g=0;g<e.length;g++)if(f=e[g],"vivliostyle-page-rule-master"!==f.d.sb){var h=1,l=lm(f,a,"utilization");l&&l.zd()&&(h=l.C);var l=qc(a,"em",!1),k=a.qb()*a.pb();a.l=Il(a.d,d,Math.ceil(h*k/(l*l)));h=a;l=c;k=void 0;for(k in l.b){var m=l.b[k];if(m&&0<m.b.length){var p=m.b[0].b;if(Sp(h,m)===p.d){a:switch(p=m.d,p){case "left":case "right":case "recto":case "verso":break a;default:p=null}m.d=un(ol(p,m.b[0].b.e))}}}a.k=
c.clone();h=a;l=h.b.page;k=void 0;for(k in h.b.b)for(m=h.b.b[k],p=m.b.length-1;0<=p;p--){var r=m.b[p];0>r.b.Ua&&r.b.d<h.l&&(r.b.Ua=l)}pc(a,a.style.b);h=lm(f,a,"enabled");if(!h||h===ke){c=a;u.debug("Location - page",c.b.page);u.debug("  current:",d);u.debug("  lookup:",c.l);d=void 0;for(d in c.b.b)for(e=c.b.b[d],g=0;g<e.b.length;g++)u.debug("  Chunk",d+":",e.b[g].b.d);d=a.N;e=f;f=b;c=e.d;0===Object.keys(f).length?(c.d.e=c,f=e):(e=c,g=zp(d,f),e=e.g+"^"+g,g=d.g[e],g||("background-host"===c.sb?(c=d,f=
(new hp(c.h,c.f.d,f)).f(c.f),f.h(c.b,c.e),zm(f,c.d),g=f):g=Ap(d,f,c),d.g[e]=g),f=g.d,f.d.e=f,f=g);return f}}throw Error("No enabled page masters");}function Op(a,b){var c=a.k.e,d=c[b.b].d;if(d){var e=b.d,f=c[d].b;if(!f.length||e<f[0])return!1;var c=Sa(f.length,function(a){return f[a]>e})-1,c=f[c],d=a.k.b[d],g=Sp(a,d);return c<g?!1:g<c?!0:!Np(a,d.d)}return!1}
function Vp(a,b,c){var d=a.b.b[c];if(!d||!Np(a,d.d))return M(!0);d.d="any";Vn(b);a.g[c]&&0<b.ib.length&&(b.Hd=!1);var e=L("layoutColumn"),f=[],g=[],h=!0;qf(function(c){for(;0<d.b.length-g.length;){for(var e=0;0<=g.indexOf(e);)e++;var m=d.b[e];if(m.b.d>a.l||Op(a,m.b))break;for(var p=e+1;p<d.b.length;p++)if(!(0<=g.indexOf(p))){var r=d.b[p];if(r.b.d>a.l||Op(a,r.b))break;fi(r.b,m.b)&&(m=r,e=p)}var w=m.b,q=!0;Yn(b,m.d,h).then(function(a){h=!1;m.b.le&&(null===a||w.f)&&f.push(e);w.f?(g.push(e),P(c)):(a?
m.d=a:g.push(e),b.g&&(d.d=un(b.g)),a||b.g?P(c):q?q=!1:sf(c))});if(q){q=!1;return}}P(c)}).then(function(){d.b=d.b.filter(function(a,b){return 0<=f.indexOf(b)||0>g.indexOf(b)});O(e,!0)});return N(e)}
function Wp(a,b,c,d,e,f,g,h){em(c);var l=lm(c,a,"enabled");if(l&&l!==ke)return M(!0);var k=L("layoutContainer"),m=lm(c,a,"wrap-flow")===wd,p=c.b?c.g&&c.F:c.f&&c.G,l=lm(c,a,"flow-from"),r=a.viewport.b.createElement("div"),w=lm(c,a,"position");v(r,"position",w?w.name:"absolute");d.insertBefore(r,d.firstChild);var q=new Ci(r);q.b=c.b;c.rb(a,q,b,a.h,a.e);q.B=e;q.D=f;e+=q.left+q.marginLeft+q.N;f+=q.top+q.marginTop+q.O;var y=!1;if(l&&l.Od())if(a.G[l.toString()])c.uc(a,q,b,null,1,a.e,a.h),l=M(!0);else{var S=
L("layoutContainer.inner"),X=l.toString(),ga=Y(c,a,"column-count"),La=Y(c,a,"column-gap"),ma=1<ga?Y(c,a,"column-width"):q.width,l=km(c,a),E=0,w=lm(c,a,"shape-inside"),K=qg(w,0,0,q.width,q.height,a),Cl=new Qm(X,a,a.viewport,a.d,l,a.aa,a.h,a.style.u,a,b,a.Ja,a.ab,h,a.Pa),El=new so(a.f,a.b.page-1),hi=0,da=null;qf(function(b){for(;hi<ga;){var c=hi++;if(1<ga){var d=a.viewport.b.createElement("div");v(d,"position","absolute");r.appendChild(d);da=new Cn(d,Cl,a.e,El);da.b=q.b;da.bb=q.bb;da.Gb=q.Gb;q.b?(v(d,
"margin-left",q.h+"px"),v(d,"margin-right",q.u+"px"),c=c*(ma+La)+q.j,Ji(da,0,q.width),Ii(da,c,ma)):(v(d,"margin-top",q.j+"px"),v(d,"margin-bottom",q.l+"px"),c=c*(ma+La)+q.h,Ii(da,0,q.height),Ji(da,c,ma));da.B=e+q.h;da.D=f+q.j}else da=new Cn(r,Cl,a.e,El),Hi(da,q),q=da;da.F=p?[]:g;da.xb=K;if(0<=da.width){var k=L("inner");Vp(a,da,X).then(function(){da.g&&"column"!=da.g&&(hi=ga,"region"!=da.g&&(a.G[X]=!0));O(k,!0)});c=N(k)}else c=M(!0);if(c.Ca()){c.then(function(){0<h.b.length?P(b):(E=Math.max(E,da.d),
sf(b))});return}0<h.b.length||(E=Math.max(E,da.d))}P(b)}).then(function(){q.d=E;c.uc(a,q,b,da,ga,a.e,a.h);O(S,!0)});l=N(S)}else(l=lm(c,a,"content"))&&Li(l)?(w=a.viewport.b.createElement("span"),l.U(new Ki(w,a)),r.appendChild(w),ym(c,a,q,a.h)):c.qa&&(d.removeChild(r),y=!0),y||c.uc(a,q,b,null,1,a.e,a.h),l=M(!0);l.then(function(){if(!c.f||0<Math.floor(q.d)){if(!y&&!m){var l=q.B+q.left,p=q.D+q.top,w=Fi(q)+q.width+Gi(q),E=Di(q)+q.height+Ei(q),X=lm(c,a,"shape-outside"),l=qg(X,l,p,w,E,a);g.push(l)}}else if(0==
c.children.length){d.removeChild(r);O(k,!0);return}var K=c.children.length-1;pf(function(){for(;0<=K;){var d=c.children[K--],d=Wp(a,b,d,r,e,f,g,h);if(d.Ca())return d}return M(!1)}).then(function(){O(k,!0)})});return N(k)}
function Xp(a,b,c){a.G={};c?(a.b=c.clone(),zl(a.d,c.d)):(a.b=new Ai,zl(a.d,-1));a.lang&&b.d.setAttribute("lang",a.lang);c=a.b;c.page++;pc(a,a.style.b);a.k=c.clone();var d=yp(a.N),e=Up(a,d);if(!e)return M(null);e.d.b.width.value===me&&Yh(b);e.d.b.height.value===ne&&Zh(b);a.f.g=b;Co(a.f,d,a);var f=Xo(Wo(d),a);Yp(a,f,b);dp(d,f,b,a);var g=f.lb+f.Ab,d=lm(e,a,"writing-mode")||Kd,f=lm(e,a,"direction")||Td,h=new Ri(b.B.bind(b),d,f),l=[],k=L("layoutNextPage");qf(function(d){Wp(a,b,e,b.d,g,g,l.concat(),h).then(function(){if(0<
h.b.length){l=l.concat(Wi(h));h.b.splice(0,h.b.length);c=a.b=a.k.clone();for(var e;e=b.d.lastChild;)b.d.removeChild(e);sf(d)}else P(d)})}).then(function(){e.O(a,b,a.e);var d=new Tc(e.d.d,"left-page");b.j=d.evaluate(a)?"left":"right";var d=a.b.page,f;for(f in a.b.b)for(var g=a.b.b[f],h=g.b.length-1;0<=h;h--){var l=g.b[h];0<=l.b.Ua&&l.b.Ua+l.b.h-1<=d&&g.b.splice(h,1)}a.b=a.k=null;c.d=a.d.b;ai(b,a.style.h.D[a.aa.url]);var y;a:{for(y in a.g)if((f=c.b[y])&&0<f.b.length){y=!1;break a}y=!0}y&&(c=null);O(k,
c)});return N(k)}function Yp(a,b,c){a.F=b.qb;a.D=b.pb;c.M.style.width=b.qb+2*b.Rc+"px";c.M.style.height=b.pb+2*b.Rc+"px";c.d.style.left=b.lb+"px";c.d.style.right=b.lb+"px";c.d.style.top=b.lb+"px";c.d.style.bottom=b.lb+"px";c.d.style.padding=b.Ab+"px"}function Zp(a,b,c,d){Sk.call(this,a.g,a,b,c,d,a.f,!c);this.e=a;this.u=!1}t(Zp,Sk);n=Zp.prototype;n.Ec=function(){};n.Dc=function(a,b,c){a=new Ul(this.e.j,a,b,c,this.e.w,this.L,Df(this.ba));Ff(this.e,new Fm(a.d,this.e,a,this.k))};
n.Eb=function(a){a=a.d;null!=this.L&&(a=Zc(this.d,this.L,a));Ff(this.e,new Zp(this.e,a,this,this.w))};n.Ac=function(){Ff(this.e,new Yk(this.d,this.ba))};n.Cc=function(){var a={};this.e.k.push({Cb:a,L:this.L});Ff(this.e,new Zk(this.d,this.ba,null,a,this.e.f))};n.Bc=function(a){var b=this.e.h[a];b||(b={},this.e.h[a]=b);Ff(this.e,new Zk(this.d,this.ba,null,b,this.e.f))};n.Gc=function(){var a={};this.e.B.push(a);Ff(this.e,new Zk(this.d,this.ba,this.L,a,this.e.f))};
n.gc=function(a){var b=this.e.l;if(a){var c=qj(b,"_pseudos"),b=c[a];b||(b={},c[a]=b)}Ff(this.e,new Zk(this.d,this.ba,null,b,this.e.f))};n.Fc=function(){this.u=!0;this.gb()};n.Ob=function(){var a=new Ip(this.e.j,this.e,this,this.k,this.e.u);Ff(this.e,a);a.Ob()};n.pa=function(){Sk.prototype.pa.call(this);if(this.u){this.u=!1;var a="R"+this.e.F++,b=G(a),c;this.L?c=new lj(b,0,this.L):c=new U(b,0);rj(this.h,"region-id").push(c);this.nb();a=new Zp(this.e,this.L,this,a);Ff(this.e,a);a.pa()}};
function $p(a){var b=a.getAttribute("content");if(!b)return"";a={};for(var c;null!=(c=b.match(/^,?\s*([-A-Za-z_.][-A-Za-z_0-9.]*)\s*=\s*([-+A-Za-z_0-9.]*)\s*/));)b=b.substr(c[0].length),a[c[1]]=c[2];b=a.width-0;a=a.height-0;return b&&a?"@-epubx-viewport{width:"+b+"px;height:"+a+"px;}":""}function aq(a){Ef.call(this);this.f=a;this.g=new gc(null);this.j=new gc(this.g);this.w=new Rl(this.g);this.D=new Zp(this,null,null,null);this.F=0;this.k=[];this.l={};this.h={};this.B=[];this.u={};this.b=this.D}
t(aq,Ef);aq.prototype.error=function(a){u.b("CSS parser:",a)};function bq(a,b){return cq(b,a)}function dq(a){wf.call(this,bq,"document");this.F=a;this.B={};this.j={};this.d={};this.D={};this.h=null;this.b=[]}t(dq,wf);function eq(a){var b=wa("user-agent.xml",va),c=L("OPSDocStore.init");hh.get().then(function(d){a.h=d;Lp.get().then(function(){a.load(b).then(function(){O(c,!0)})})});return N(c)}function fq(a,b,c){a.b.splice(0);b&&b.forEach(a.G,a);c&&c.forEach(a.N,a)}
dq.prototype.G=function(a){this.b.push({url:a.url,text:a.text,La:"Author",va:null,media:null})};dq.prototype.N=function(a){this.b.push({url:a.url,text:a.text,La:"User",va:null,media:null})};
function cq(a,b){var c=L("OPSDocStore.load"),d=b.url;Hh(b,a).then(function(b){if(b){for(var f=[],g=b.b.getElementsByTagNameNS("http://www.idpf.org/2007/ops","trigger"),h=0;h<g.length;h++){var l=g[h],k=l.getAttributeNS("http://www.w3.org/2001/xml-events","observer"),m=l.getAttributeNS("http://www.w3.org/2001/xml-events","event"),p=l.getAttribute("action"),l=l.getAttribute("ref");k&&m&&p&&l&&f.push({ie:k,event:m,action:p,ec:l})}a.D[d]=f;var r=[],f=wa("user-agent-page.css",va);r.push({url:f,text:null,
La:"UA",va:null,media:null});if(f=b.h)for(f=f.firstChild;f;f=f.nextSibling)if(1==f.nodeType)if(g=f,h=g.namespaceURI,k=g.localName,"http://www.w3.org/1999/xhtml"==h)if("style"==k)r.push({url:d,text:g.textContent,La:"Author",va:null,media:null});else if("link"==k){if(m=g.getAttribute("rel"),h=g.getAttribute("class"),k=g.getAttribute("media"),"stylesheet"==m||"alternate stylesheet"==m&&h)g=g.getAttribute("href"),g=wa(g,d),r.push({url:g,text:null,va:h,media:k,La:"Author"})}else"meta"==k&&"viewport"==
g.getAttribute("name")&&r.push({url:d,text:$p(g),La:"Author",L:null,media:null});else"http://www.gribuser.ru/xml/fictionbook/2.0"==h?"stylesheet"==k&&"text/css"==g.getAttribute("type")&&r.push({url:d,text:g.textContent,La:"Author",va:null,media:null}):"http://example.com/sse"==h&&"property"===k&&(h=g.getElementsByTagName("name")[0])&&"stylesheet"===h.textContent&&(g=g.getElementsByTagName("value")[0])&&(g=wa(g.textContent,d),r.push({url:g,text:null,va:null,media:null,La:"Author"}));for(h=0;h<a.b.length;h++)r.push(a.b[h]);
for(var w="",h=0;h<r.length;h++)w+=r[h].url,w+="^",r[h].text&&(w+=r[h].text),w+="^";var q=a.B[w];q?(a.d[d]=q,O(c,b)):(f=a.j[w],f||(f=new yf(function(){var b=L("fetchStylesheet"),c=0,d=new aq(a.h);pf(function(){if(c<r.length){var a=r[c++];d.Pb(a.La);return null!==a.text?ig(a.text,d,a.url,a.va,a.media).kd(!0):hg(a.url,d,a.va,a.media)}return M(!1)}).then(function(){q=new Mp(a,d.g,d.j,d.D.g,d.w,d.k,d.l,d.h,d.B,d.u);a.B[w]=q;delete a.j[w];O(b,q)});return N(b)},"FetchStylesheet "+d),a.j[w]=f,f.start()),
f.get().then(function(f){a.d[d]=f;O(c,b)}))}else O(c,null)});return N(c)};function gq(a,b,c,d,e,f,g,h,l,k){this.b=a;this.url=b;this.lang=c;this.d=d;this.h=e;this.T=Yb(f);this.j=g;this.g=h;this.f=l;this.e=k;this.Sa=this.page=null}function hq(a,b,c){if(0!=c--)for(b=b.firstChild;b;b=b.nextSibling)if(1==b.nodeType){var d=b;"auto"!=Ia(d,"height","auto")&&(v(d,"height","auto"),hq(a,d,c));"absolute"==Ia(d,"position","static")&&(v(d,"position","relative"),hq(a,d,c))}}
function iq(a){var b=a.target,c="\u25b8"==b.textContent;b.textContent=c?"\u25be":"\u25b8";for(b=b.parentNode.firstChild;b;)if(1!=b.nodeType)b=b.nextSibling;else{var d=b;"toc-container"==d.getAttribute("data-adapt-class")?b=d.firstChild:("toc-node"==d.getAttribute("data-adapt-class")&&(d.style.height=c?"auto":"0px"),b=b.nextSibling)}a.stopPropagation()}
gq.prototype.$c=function(a){var b=this.j.$c(a);return function(a,d,e){var f=e.behavior;if(!f||"toc-node"!=f.toString()&&"toc-container"!=f.toString())return b(a,d,e);a=d.getAttribute("data-adapt-class");"toc-node"==a&&(e=d.firstChild,"\u25b8"!=e.textContent&&(e.textContent="\u25b8",v(e,"cursor","pointer"),e.addEventListener("click",iq,!1)));var g=d.ownerDocument.createElement("div");g.setAttribute("data-adapt-process-children","true");"toc-node"==f.toString()?(e=d.ownerDocument.createElement("div"),
e.textContent="\u25b9",v(e,"margin-left","-1em"),v(e,"display","inline-block"),v(e,"width","1em"),v(e,"text-align","left"),v(e,"cursor","default"),v(e,"font-family","Menlo,sans-serif"),g.appendChild(e),v(g,"overflow","hidden"),g.setAttribute("data-adapt-class","toc-node"),"toc-node"!=a&&"toc-container"!=a||v(g,"height","0px")):"toc-node"==a&&g.setAttribute("data-adapt-class","toc-container");return M(g)}};
gq.prototype.zc=function(a,b,c,d,e){if(this.page)return M(this.page);var f=this,g=L("showTOC"),h=new Xh(a,a);this.page=h;this.b.load(this.url).then(function(d){var k=f.b.d[d.url],m=Pp(k,c,1E5,e);b=new sn(b.f,m.fontSize,b.root,m.width,m.height);var p=new Qp(k,d,f.lang,b,f.d,f.h,f.$c(d),f.g,0,f.f,f.e);f.Sa=p;p.T=f.T;Rp(p).then(function(){Xp(p,h,null).then(function(){hq(f,a,2);O(g,h)})})});return N(g)};
gq.prototype.vc=function(){if(this.page){var a=this.page;this.Sa=this.page=null;v(a.M,"visibility","none");var b=a.M.parentNode;b&&b.removeChild(a.M)}};gq.prototype.Ad=function(){return!!this.page};function jq(){dq.call(this,kq(this));this.e=new wf(Hh,"document");this.u=new wf(zf,"text");this.w={};this.Y={};this.k={};this.l={}}t(jq,dq);function kq(a){return function(b){return a.k[b]}}
function lq(a,b,c){var d=L("loadEPUBDoc");"/"!==b.substring(b.length-1)&&(b+="/");c&&a.u.sc(b+"?r=list");a.e.sc(b+"META-INF/encryption.xml");var e=b+"META-INF/container.xml";a.e.load(e,!0,"Failed to fetch EPUB container.xml from "+e).then(function(f){if(f){f=Rh(wh(wh(wh(new xh([f.b]),"container"),"rootfiles"),"rootfile"),"full-path");for(var g=0;g<f.length;g++){var h=f[g];if(h){mq(a,b,h,c).ua(d);return}}O(d,null)}else u.error("Received an empty response for EPUB container.xml "+e+". This may be caused by the server not allowing cross origin requests.")});
return N(d)}function mq(a,b,c,d){var e=b+c,f=a.w[e];if(f)return M(f);var g=L("loadOPF");a.e.load(e,void 0,void 0).then(function(c){c?a.e.load(b+"META-INF/encryption.xml",void 0,void 0).then(function(l){(d?a.u.load(b+"?r=list"):M(null)).then(function(d){f=new nq(a,b);oq(f,c,l,d,b+"?r=manifest").then(function(){a.w[e]=f;a.Y[b]=f;O(g,f)})})}):u.error("Received an empty response for EPUB OPF "+e+". This may be caused by the server not allowing cross origin requests.")});return N(g)}
function pq(a,b,c){var d=L("EPUBDocStore.load");b=ua(b);(a.l[b]=cq(a,{status:200,url:b,contentType:c.contentType,responseText:null,responseXML:c,yc:null})).ua(d);return N(d)}
jq.prototype.load=function(a){var b=ua(a);if(a=this.l[b])return a.Ca()?a:M(a.get());var c=L("EPUBDocStore.load");a=jq.Vd.load.call(this,b,!0,"Failed to fetch a source document from "+b);a.then(function(a){a?O(c,a):u.error("Received an empty response for "+b+". This may be caused by the server not allowing cross origin requests.")});return N(c)};function qq(){this.id=null;this.src="";this.f=this.d=null;this.H=-1;this.h=0;this.j=null;this.b=this.e=0;this.Db=this.Ua=null;this.g=Va}
function rq(a){return a.id}function sq(a){var b=Re(a);return function(a){var d=L("deobfuscator"),e,f;a.slice?(e=a.slice(0,1040),f=a.slice(1040,a.size)):(e=a.webkitSlice(0,1040),f=a.webkitSlice(1040,a.size-1040));vf(e).then(function(a){a=new DataView(a);for(var c=0;c<a.byteLength;c++){var e=a.getUint8(c),e=e^b[c%20];a.setUint8(c,e)}O(d,uf([a,f]))});return N(d)}}
var tq={dcterms:"http://purl.org/dc/terms/",marc:"http://id.loc.gov/vocabulary/",media:"http://www.idpf.org/epub/vocab/overlays/#",onix:"http://www.editeur.org/ONIX/book/codelists/current.html#",xsd:"http://www.w3.org/2001/XMLSchema#"},uq=tq.dcterms+"language",vq=tq.dcterms+"title";
function wq(a,b){var c={};return function(d,e){var f,g,h=d.r||c,l=e.r||c;if(a==vq&&(f="main"==h["http://idpf.org/epub/vocab/package/#title-type"],g="main"==l["http://idpf.org/epub/vocab/package/#title-type"],f!=g))return f?-1:1;f=parseInt(h["http://idpf.org/epub/vocab/package/#display-seq"],10);isNaN(f)&&(f=Number.MAX_VALUE);g=parseInt(l["http://idpf.org/epub/vocab/package/#display-seq"],10);isNaN(g)&&(g=Number.MAX_VALUE);return f!=g?f-g:a!=uq&&b&&(f=(h[uq]||h["http://idpf.org/epub/vocab/package/#alternate-script"])==
b,g=(l[uq]||l["http://idpf.org/epub/vocab/package/#alternate-script"])==b,f!=g)?f?-1:1:d.o-e.o}}
function xq(a,b){function c(a){for(var b in a){var d=a[b];d.sort(wq(b,k));for(var e=0;e<d.length;e++){var f=d[e].r;f&&c(f)}}}function d(a){return Ya(a,function(a){return Xa(a,function(a){var b={v:a.value,o:a.Q};a.Ne&&(b.s=a.scheme);if(a.id||a.lang){var c=l[a.id];if(c||a.lang)a.lang&&(a={name:uq,value:a.lang,lang:null,id:null,gd:a.id,scheme:null,Q:a.Q},c?c.push(a):c=[a]),c=Wa(c,function(a){return a.name}),b.r=d(c)}return b})})}function e(a){if(a&&(a=a.match(/^\s*(([^:]*):)?(\S+)\s*$/))){var b=a[1]?
f[a[1]]:"http://idpf.org/epub/vocab/package/#";if(b)return b+a[3]}return null}var f;if(b){f={};for(var g in tq)f[g]=tq[g];for(;null!=(g=b.match(/(^\s*[A-Z_a-z\u007F-\uFFFF][-.A-Z_a-z0-9\u007F-\uFFFF]*):\s*(\S+)/));)b=b.substr(g[0].length),f[g[1]]=g[2]}else f=tq;var h=1;g=Ph(Qh(a),function(a){if("meta"==a.localName){var b=e(a.getAttribute("property"));if(b)return{name:b,value:a.textContent,id:a.getAttribute("id"),Q:h++,gd:a.getAttribute("refines"),lang:null,scheme:e(a.getAttribute("scheme"))}}else if("http://purl.org/dc/elements/1.1/"==
a.namespaceURI)return{name:tq.dcterms+a.localName,Q:h++,lang:a.getAttribute("xml:lang"),value:a.textContent,id:a.getAttribute("id"),gd:null,scheme:null};return null});var l=Wa(g,function(a){return a.gd});g=d(Wa(g,function(a){return a.gd?null:a.name}));var k=null;g[uq]&&(k=g[uq][0].v);c(g);return g}function yq(){var a=window.MathJax;return a?a.Hub:null}var zq={"appliaction/xhtml+xml":!0,"image/jpeg":!0,"image/png":!0,"image/svg+xml":!0,"image/gif":!0,"audio/mp3":!0};
function nq(a,b){this.e=a;this.h=this.d=this.b=this.g=this.f=null;this.l=b;this.k=null;this.G={};this.lang=null;this.u=0;this.D={};this.N=this.F=this.O=null;this.w={};this.B=null;this.j=Aq(this);yq()&&(bj["http://www.w3.org/1998/Math/MathML"]=!0)}
function Aq(a){function b(){}b.prototype.ld=function(a,b){return encodeURIComponent(b+(a?"#"+a:""))};b.prototype.b=function(b,d){var e=b.match(/^([^#]*)#?(.*)$/);if(e){var f=e[1]||d,e=e[2];if(f&&a.g.some(function(a){return a.src===f}))return"#"+this.ld(e,f)}return b};b.prototype.me=function(a){"#"===a.charAt(0)&&(a=a.substring(1));return(a=decodeURIComponent(a).match(/^([^#]*)#?(.*)$/))?[a[1],a[2]]:[]};return new b}
function Bq(a,b){return a.l?b.substr(0,a.l.length)==a.l?decodeURI(b.substr(a.l.length)):null:b}
function oq(a,b,c,d,e){a.f=b;var f=wh(new xh([b.b]),"package"),g=Rh(f,"unique-identifier")[0];g&&(g=Dh(b,b.url+"#"+g))&&(a.k=g.textContent.replace(/[ \n\r\t]/g,""));var h={};a.g=Xa(Nh(wh(wh(f,"manifest"),"item")),function(c){var d=new qq,e=b.url;d.id=c.getAttribute("id");d.src=wa(c.getAttribute("href"),e);d.d=c.getAttribute("media-type");if(e=c.getAttribute("properties")){for(var e=e.split(/\s+/),f={},g=0;g<e.length;g++)f[e[g]]=!0;d.g=f}(c=c.getAttribute("fallback"))&&!zq[d.d]&&(h[d.src]=c);!a.F&&
d.g.nav&&(a.F=d);!a.N&&d.g["cover-image"]&&(a.N=d);return d});a.d=Ua(a.g,rq);a.h=Ua(a.g,function(b){return Bq(a,b.src)});for(var l in h)for(g=l;;){g=a.d[h[g]];if(!g)break;if(zq[g.d]){a.w[l]=g.src;break}g=g.src}a.b=Xa(Nh(wh(wh(f,"spine"),"itemref")),function(b,c){var d=b.getAttribute("idref");if(d=a.d[d])d.f=b,d.H=c;return d});if(l=Rh(wh(f,"spine"),"toc")[0])a.O=a.d[l];if(l=Rh(wh(f,"spine"),"page-progression-direction")[0]){a:switch(l){case "ltr":l="ltr";break a;case "rtl":l="rtl";break a;default:throw Error("unknown PageProgression: "+
l);}a.B=l}var g=c?Rh(wh(wh(Mh(wh(wh(new xh([c.b]),"encryption"),"EncryptedData"),Lh()),"CipherData"),"CipherReference"),"URI"):[],k=Nh(wh(wh(f,"bindings"),"mediaType"));for(c=0;c<k.length;c++){var m=k[c].getAttribute("handler");(l=k[c].getAttribute("media-type"))&&m&&a.d[m]&&(a.G[l]=a.d[m].src)}a.D=xq(wh(f,"metadata"),Rh(f,"prefix")[0]);a.D[uq]&&(a.lang=a.D[uq][0].v);if(!d){if(0<g.length&&a.k)for(d=sq(a.k),c=0;c<g.length;c++)a.e.k[a.l+g[c]]=d;return M(!0)}f=new Ja;k={};if(0<g.length&&a.k)for(l="1040:"+
Se(a.k),c=0;c<g.length;c++)k[g[c]]=l;for(c=0;c<d.length;c++){var p=d[c];if(m=p.n){var r=decodeURI(m),g=a.h[r];l=null;g&&(g.j=0!=p.m,g.h=p.c,g.d&&(l=g.d.replace(/\s+/g,"")));g=k[r];if(l||g)f.append(m),f.append(" "),f.append(l||"application/octet-stream"),g&&(f.append(" "),f.append(g)),f.append("\n")}}Cq(a);return tf(e,"","POST",f.toString(),"text/plain")}function Cq(a){for(var b=0,c=0;c<a.b.length;c++){var d=a.b[c],e=Math.ceil(d.h/1024);d.e=b;d.b=e;b+=e}a.u=b}
function Dq(a,b,c){a.d={};a.h={};a.g=[];a.b=a.g;var d=a.f=new vh(null,"",(new DOMParser).parseFromString("<spine></spine>","text/xml"));b.forEach(function(a){var b=new qq;b.H=a.index;b.id="item"+(a.index+1);b.src=a.url;b.Ua=a.Ua;b.Db=a.Db;var c=d.b.createElement("itemref");c.setAttribute("idref",b.id);d.root.appendChild(c);b.f=c;this.d[b.id]=b;this.h[a.url]=b;this.g.push(b)},a);return c?pq(a.e,b[0].url,c):M(null)}
function Eq(a,b,c){var d=a.b[b],e=L("getCFI");a.e.load(d.src).then(function(a){var b=Bh(a,c),h=null;b&&(a=zh(a,b,0,!1),h=new jb,mb(h,b,c-a),d.f&&mb(h,d.f,0),h=h.toString());O(e,h)});return N(e)}
function Fq(a,b){return Ye("resolveFragment",function(c){if(b){var d=new jb;kb(d,b);var e;if(a.f){var f=lb(d,a.f.b);if(1!=f.ga.nodeType||f.I||!f.ec){O(c,null);return}var g=f.ga,h=g.getAttribute("idref");if("itemref"!=g.localName||!h||!a.d[h]){O(c,null);return}e=a.d[h];d=f.ec}else e=a.b[0];a.e.load(e.src).then(function(a){var b=lb(d,a.b);a=zh(a,b.ga,b.offset,b.I);O(c,{H:e.H,ta:a,R:-1})})}else O(c,null)},function(a,d){u.b(d,"Cannot resolve fragment:",b);O(a,null)})}
function Gq(a,b){return Ye("resolveEPage",function(c){if(0>=b)O(c,{H:0,ta:0,R:-1});else{var d=Sa(a.b.length,function(c){c=a.b[c];return c.e+c.b>b}),e=a.b[d];a.e.load(e.src).then(function(a){b-=e.e;b>e.b&&(b=e.b);var g=0;0<b&&(a=Ah(a),g=Math.round(a*b/e.b),g==a&&g--);O(c,{H:d,ta:g,R:-1})})}},function(a,d){u.b(d,"Cannot resolve epage:",b);O(a,null)})}
function Hq(a,b){var c=a.b[b.H];if(0>=b.ta)return M(c.e);var d=L("getEPage");a.e.load(c.src).then(function(a){a=Ah(a);var f=Math.min(a,b.ta);O(d,c.e+f*c.b/a)});return N(d)}function Iq(a,b){return{page:a,position:{H:a.H,R:b,ta:a.offset}}}function Jq(a,b,c,d,e){this.b=a;this.viewport=b;this.g=c;this.h=e;this.Nb=[];this.T=Yb(d);this.f=new pn(b.f);this.d=new Ao(a.j)}function Kq(a,b){var c=a.Nb[b.H];return c?c.cb[b.R]:null}n=Jq.prototype;
n.ob=function(a){return this.b.B?this.b.B:(a=this.Nb[a?a.H:0])?a.Sa.Y:null};function Lq(a,b,c,d){c.M.style.display="none";c.M.style.visibility="visible";c.M.style.position="";c.M.style.top="";c.M.style.left="";c.M.setAttribute("data-vivliostyle-page-side",c.j);var e=b.cb[d];c.l=0==b.item.H&&0==d;b.cb[d]=c;e?(b.Sa.viewport.d.replaceChild(c.M,e.M),$a(e,{type:"replaced",target:null,currentTarget:null,Sd:c})):b.Sa.viewport.d.appendChild(c.M);a.h(b.Sa.qa,b.item.H,d)}
function Mq(a,b,c){var d=L("renderSinglePage"),e=Nq(a,b,c);Xp(b.Sa,e,c).then(function(f){var g=(c=f)?c.page-1:b.Fa.length-1;Lq(a,b,e,g);Eo(a.d,e.H,g);f=null;if(c){var h=b.Fa[c.page];b.Fa[c.page]=c;h&&b.cb[c.page]&&(Bi(c,h)||(f=Mq(a,b,c)))}f||(f=M(!0));f.then(function(){var b=Fo(a.d,e),f=0;qf(function(c){f++;if(f>b.length)P(c);else{var d=b[f-1];d.xc=d.xc.filter(function(a){return!a.fc});0===d.xc.length?sf(c):Oq(a,d.H).then(function(b){b?(Do(a.d,d.cd),Go(a.d,d.xc),Mq(a,b,b.Fa[d.R]).then(function(b){var d=
a.d;d.b=d.u.pop();d=a.d;d.e=d.B.pop();d=b.ac.position;d.H===e.H&&d.R===g&&(e=b.ac.page);sf(c)})):sf(c)})}}).then(function(){O(d,{ac:Iq(e,g),Td:c})})})});return N(d)}function Pq(a,b){var c=a.R,d=-1;0>c&&(d=a.ta,c=Sa(b.Fa.length,function(a){return Tp(b.Sa,b.Fa[a],!0)>d}),c=c===b.Fa.length?b.complete?b.Fa.length-1:Number.POSITIVE_INFINITY:c-1);return{H:a.H,R:c,ta:d}}
function Qq(a,b,c){var d=L("findPage");Oq(a,b.H).then(function(e){if(e){var f=null,g;qf(function(d){var l=Pq(b,e);g=l.R;(f=e.cb[g])?P(d):e.complete?(g=e.Fa.length-1,f=e.cb[g],P(d)):c?Rq(a,l).then(function(a){a&&(f=a.page);P(d)}):of(100).then(function(){sf(d)})}).then(function(){O(d,Iq(f,g))})}else O(d,null)});return N(d)}
function Rq(a,b){var c=L("renderPage");Oq(a,b.H).then(function(d){if(d){var e=Pq(b,d),f=e.R,g=e.ta,h=d.cb[f];h?O(c,Iq(h,f)):qf(function(b){if(f<d.Fa.length)P(b);else if(d.complete)f=d.Fa.length-1,P(b);else{var c=d.Fa[d.Fa.length-1];Mq(a,d,c).then(function(e){var p=e.ac.page;(c=e.Td)?0<=g&&Tp(d.Sa,c)>g?(h=p,f=d.Fa.length-2,P(b)):sf(b):(h=p,f=e.ac.position.R,d.complete=!0,p.k=d.item.H===a.b.b.length-1,P(b))})}}).then(function(){h=h||d.cb[f];var b=d.Fa[f];h?O(c,Iq(h,f)):Mq(a,d,b).then(function(b){b.Td||
(d.complete=!0,b.ac.page.k=d.item.H===a.b.b.length-1);O(c,b.ac)})})}else O(c,null)});return N(c)}n.hd=function(){return Sq(this,{H:this.b.b.length-1,R:Number.POSITIVE_INFINITY,ta:-1})};function Sq(a,b){var c=L("renderAllPages");b||(b={H:0,R:0,ta:0});var d=b.H,e=b.R,f=0,g;qf(function(c){Rq(a,{H:f,R:f===d?e:Number.POSITIVE_INFINITY,ta:f===d?b.ta:-1}).then(function(a){g=a;++f>d?P(c):sf(c)})}).then(function(){O(c,g)});return N(c)}n.be=function(){return Qq(this,{H:0,R:0,ta:-1})};
n.ce=function(){return Qq(this,{H:this.b.b.length-1,R:Number.POSITIVE_INFINITY,ta:-1})};n.nextPage=function(a,b){var c=this,d=a.H,e=a.R,f=L("nextPage");Oq(c,d).then(function(a){if(a){if(a.complete&&e==a.Fa.length-1){if(d>=c.b.b.length-1){O(f,null);return}d++;e=0}else e++;Qq(c,{H:d,R:e,ta:-1},b).ua(f)}else O(f,null)});return N(f)};n.fd=function(a){var b=a.H;a=a.R;if(0==a){if(0==b)return M(null);b--;a=Number.POSITIVE_INFINITY}else a--;return Qq(this,{H:b,R:a,ta:-1})};
function Tq(a,b,c){b="left"===b.j;a="ltr"===a.ob(c);return!b&&a||b&&!a}function Uq(a,b,c){var d=L("getCurrentSpread"),e=Kq(a,b);if(!e)return M({left:null,right:null});var f="left"===e.j;(Tq(a,e,b)?a.fd(b):a.nextPage(b,c)).then(function(a){a=a&&a.page;f?O(d,{left:e,right:a}):O(d,{left:a,right:e})});return N(d)}n.he=function(a,b){var c=Kq(this,a);if(!c)return M(null);var c=Tq(this,c,a),d=this.nextPage(a,!!b);if(c)return d;var e=this;return d.Qb(function(a){return a?e.nextPage(a.position,!!b):M(null)})};
n.ke=function(a){var b=Kq(this,a);if(!b)return M(null);b=Tq(this,b,a);a=this.fd(a);if(b){var c=this;return a.Qb(function(a){return a?c.fd(a.position):M(null)})}return a};function Vq(a,b){var c=L("navigateToEPage");Gq(a.b,b).then(function(b){b?Qq(a,b).ua(c):O(c,null)});return N(c)}function Wq(a,b){var c=L("navigateToCFI");Fq(a.b,b).then(function(b){b?Qq(a,b).ua(c):O(c,null)});return N(c)}
function Xq(a,b,c){u.debug("Navigate to",b);var d=Bq(a.b,ua(b));if(!d){if(a.b.f&&b.match(/^#epubcfi\(/))d=Bq(a.b,a.b.f.url);else if("#"===b.charAt(0)){var e=a.b.j.me(b);a.b.f?d=Bq(a.b,e[0]):d=e[0];b=d+(e[1]?"#"+e[1]:"")}if(null==d)return M(null)}var f=a.b.h[d];if(!f)return a.b.f&&d==Bq(a.b,a.b.f.url)&&(d=b.indexOf("#"),0<=d)?Wq(a,b.substr(d+1)):M(null);var g=L("navigateTo");Oq(a,f.H).then(function(d){var e=Dh(d.aa,b);e?Qq(a,{H:f.H,R:-1,ta:yh(d.aa,e)}).ua(g):c.H!==f.H?Qq(a,{H:f.H,R:0,ta:-1}).ua(g):
O(g,null)});return N(g)}
function Nq(a,b,c){var d=b.Sa.viewport,e=d.b.createElement("div");e.setAttribute("data-vivliostyle-page-container",!0);e.style.position="absolute";e.style.top="0";e.style.left="0";ka||(e.style.visibility="hidden");d.root.appendChild(e);var f=d.b.createElement("div");f.setAttribute("data-vivliostyle-bleed-box",!0);e.appendChild(f);var g=new Xh(e,f);g.H=b.item.H;g.position=c;g.offset=Tp(b.Sa,c);0===g.offset&&(b=a.b.j.ld("",b.item.src),f.setAttribute("id",b),$h(g,f,b));d!==a.viewport&&(a=ac(a.viewport.width,
a.viewport.height,d.width,d.height),a=jg(null,new Ub(a,null)),g.h.push(new Uh(e,"transform",a)));return g}function Yq(a,b){var c=yq();if(c){var d=b.ownerDocument,e=d.createElement("span");b.appendChild(e);d=d.importNode(a,!0);e.appendChild(d);d=c.queue;d.Push(["Typeset",c,e]);var c=L("makeMathJaxView"),f=hf(c);d.Push(function(){f.Ta(e)});return N(c)}return M(null)}
n.$c=function(a){var b=this;return function(c,d){var e;if("object"==c.localName&&"http://www.w3.org/1999/xhtml"==c.namespaceURI){var f=c.getAttribute("data");e=null;if(f){var f=wa(f,a.url),g=c.getAttribute("media-type");if(!g){var h=Bq(b.b,f);h&&(h=b.b.h[h])&&(g=h.d)}if(g&&(h=b.b.G[g])){e=b.viewport.b.createElement("iframe");e.style.border="none";var f=Oa(f),l=Oa(g),g=new Ja;g.append(h);g.append("?src=");g.append(f);g.append("&type=");g.append(l);for(h=c.firstChild;h;h=h.nextSibling)1==h.nodeType&&
(l=h,"param"==l.localName&&"http://www.w3.org/1999/xhtml"==l.namespaceURI&&(f=l.getAttribute("name"),l=l.getAttribute("value"),f&&l&&(g.append("&"),g.append(encodeURIComponent(f)),g.append("="),g.append(encodeURIComponent(l)))));e.setAttribute("src",g.toString());(g=c.getAttribute("width"))&&e.setAttribute("width",g);(g=c.getAttribute("height"))&&e.setAttribute("height",g)}}e||(e=b.viewport.b.createElement("span"),e.setAttribute("data-adapt-process-children","true"));e=M(e)}else if("http://www.w3.org/1998/Math/MathML"==
c.namespaceURI)e=Yq(c,d);else if("http://example.com/sse"==c.namespaceURI){e=d?d.ownerDocument:b.viewport.b;g=c.localName;switch(g){case "t":case "tab":case "ec":case "nt":case "fraction":case "comment":case "mark":g="span";break;case "ruby":case "rp":case "rt":break;default:g="div"}e=e.createElement(g);e.setAttribute("data-adapt-process-children","true");e=M(e)}else e=c.dataset&&"true"==c.dataset.mathTypeset?Yq(c,d):M(null);return e}};
function Oq(a,b){if(b>=a.b.b.length)return M(null);var c=a.Nb[b];if(c)return M(c);var d=a.b.b[b],e=a.b.e,f=L("getPageViewItem");e.load(d.src).then(function(g){0==d.b&&1==a.b.b.length&&(d.b=Math.ceil(Ah(g)/2700),a.b.u=d.b);var h=e.d[g.url],l=a.$c(g),k=a.viewport,m=Pp(h,k.width,k.height,k.fontSize);if(m.width!=k.width||m.height!=k.height||m.fontSize!=k.fontSize)k=new sn(k.f,m.fontSize,k.root,m.width,m.height);m=a.Nb[b-1];null!==d.Ua?m=d.Ua-1:(m=m?m.Sa.ma+m.cb.length:0,null!==d.Db&&(m+=d.Db));Bo(a.d,
m);var p=new Qp(h,g,a.b.lang,k,a.f,a.g,l,a.b.w,m,a.b.j,a.d);p.T=a.T;Rp(p).then(function(){c={item:d,aa:g,Sa:p,Fa:[null],cb:[],complete:!1};a.Nb[b]=c;O(f,c)})});return N(f)}
n.zc=function(){var a=this.b,b=a.F||a.O;if(!b)return M(null);var c=L("showTOC");this.e||(this.e=new gq(a.e,b.src,a.lang,this.f,this.g,this.T,this,a.w,a.j,this.d));var a=this.viewport,b=Math.min(350,Math.round(.67*a.width)-16),d=a.height-6,e=a.b.createElement("div");a.root.appendChild(e);e.style.position="absolute";e.style.visibility="hidden";e.style.left="3px";e.style.top="3px";e.style.width=b+10+"px";e.style.maxHeight=d+"px";e.style.overflow="scroll";e.style.overflowX="hidden";e.style.background=
"#EEE";e.style.border="1px outset #999";e.style.borderRadius="2px";e.style.boxShadow=" 5px 5px rgba(128,128,128,0.3)";this.e.zc(e,a,b,d,this.viewport.fontSize).then(function(a){e.style.visibility="visible";O(c,a)});return N(c)};n.vc=function(){this.e&&this.e.vc()};n.Ad=function(){return this.e&&this.e.Ad()};function Zq(a,b,c,d){var e=this;this.h=a;this.md=b;b.setAttribute("data-vivliostyle-viewer-viewport",!0);b.setAttribute("data-vivliostyle-viewer-status","loading");this.Pa=c;this.Ja=d;a=a.document;this.qa=new qh(a.head,b);this.u="loading";this.N=[];this.g=null;this.D=this.d=!1;this.e=this.j=this.f=this.w=null;this.fontSize=16;this.zoom=1;this.ia=!1;this.hd=!0;this.T=Xb();this.G=function(){};this.l=function(){};this.Y=function(){e.d=!0;e.G()};this.dd=this.dd.bind(this);this.B=function(){};this.F=a.getElementById("vivliostyle-page-rules");
this.O=!1;this.k=null;this.ma={loadEPUB:this.Yd,loadXML:this.Zd,configure:this.ud,moveTo:this.Aa,toc:this.zc};$q(this)}function $q(a){ta(1,function(a){ar(this,{t:"debug",content:a})}.bind(a));ta(2,function(a){ar(this,{t:"info",content:a})}.bind(a));ta(3,function(a){ar(this,{t:"warn",content:a})}.bind(a));ta(4,function(a){ar(this,{t:"error",content:a})}.bind(a))}function ar(a,b){b.i=a.Pa;a.Ja(b)}
function br(a,b){a.u!==b&&(a.u=b,a.md.setAttribute("data-vivliostyle-viewer-status",b),ar(a,{t:"readystatechange"}))}n=Zq.prototype;n.Yd=function(a){No.d("beforeRender");br(this,"loading");var b=a.url,c=a.fragment,d=!!a.zipmeta,e=a.authorStyleSheet,f=a.userStyleSheet;this.viewport=null;var g=L("loadEPUB"),h=this;h.ud(a).then(function(){var a=new jq;eq(a).then(function(){var k=wa(b,h.h.location.href);h.N=[k];lq(a,k,d).then(function(a){h.g=a;cr(h,e,f,c).then(function(){O(g,!0)})})})});return N(g)};
n.Zd=function(a){No.d("beforeRender");br(this,"loading");var b=a.url,c=a.document,d=a.fragment,e=a.authorStyleSheet,f=a.userStyleSheet;this.viewport=null;var g=L("loadXML"),h=this;h.ud(a).then(function(){var a=new jq;eq(a).then(function(){var k=b.map(function(a,b){return{url:wa(a.url,h.h.location.href),index:b,Ua:a.Ua,Db:a.Db}});h.N=k.map(function(a){return a.url});h.g=new nq(a,"");Dq(h.g,k,c).then(function(){cr(h,e,f,d).then(function(){O(g,!0)})})})});return N(g)};
function cr(a,b,c,d){dr(a);fq(a.g.e,b,c);var e;d?e=Fq(a.g,d).Qb(function(b){a.e=b;return M(!0)}):e=M(!0);return e.Qb(function(){No.b("beforeRender");return er(a)})}function fr(a,b){var c=parseFloat(b),d=/[a-z]+$/,e;if("string"===typeof b&&(e=b.match(d))){d=e[0];if("em"===d||"rem"===d)return c*a.fontSize;if("ex"===d||"rex"===d)return c*mc.ex*a.fontSize/mc.em;if(d=mc[d])return c*d}return c}
n.ud=function(a){"boolean"==typeof a.autoresize&&(a.autoresize?(this.w=null,this.h.addEventListener("resize",this.Y,!1),this.d=!0):this.h.removeEventListener("resize",this.Y,!1));if("number"==typeof a.fontSize){var b=a.fontSize;5<=b&&72>=b&&this.fontSize!=b&&(this.fontSize=b,this.d=!0)}"object"==typeof a.viewport&&a.viewport&&(b=a.viewport,b={marginLeft:fr(this,b["margin-left"])||0,marginRight:fr(this,b["margin-right"])||0,marginTop:fr(this,b["margin-top"])||0,marginBottom:fr(this,b["margin-bottom"])||
0,width:fr(this,b.width)||0,height:fr(this,b.height)||0},200<=b.width||200<=b.height)&&(this.h.removeEventListener("resize",this.Y,!1),this.w=b,this.d=!0);"boolean"==typeof a.hyphenate&&(this.T.Uc=a.hyphenate,this.d=!0);"boolean"==typeof a.horizontal&&(this.T.Tc=a.horizontal,this.d=!0);"boolean"==typeof a.nightMode&&(this.T.ad=a.nightMode,this.d=!0);"number"==typeof a.lineHeight&&(this.T.lineHeight=a.lineHeight,this.d=!0);"number"==typeof a.columnWidth&&(this.T.Qc=a.columnWidth,this.d=!0);"string"==
typeof a.fontFamily&&(this.T.fontFamily=a.fontFamily,this.d=!0);"boolean"==typeof a.load&&(this.ia=a.load);"boolean"==typeof a.renderAllPages&&(this.hd=a.renderAllPages);"string"==typeof a.userAgentRootURL&&(va=a.userAgentRootURL);"boolean"==typeof a.spreadView&&a.spreadView!==this.T.$a&&(this.viewport=null,this.T.$a=a.spreadView,this.d=!0);"number"==typeof a.pageBorder&&a.pageBorder!==this.T.Mb&&(this.viewport=null,this.T.Mb=a.pageBorder,this.d=!0);"number"==typeof a.zoom&&a.zoom!==this.zoom&&(this.zoom=
a.zoom,this.D=!0);return M(!0)};n.dd=function(a){var b=this.f,c=this.j,d=a.target;c?c.left!==d&&c.right!==d||gr(this,a.Sd):b===a.target&&gr(this,a.Sd)};function hr(a){var b=[];a.f&&(b.push(a.f),a.f=null);a.j&&(b.push(a.j.left),b.push(a.j.right),a.j=null);b.forEach(function(a){a&&(v(a.M,"display","none"),a.removeEventListener("hyperlink",this.B,!1),a.removeEventListener("replaced",this.dd,!1))},a)}
function ir(a,b){b.addEventListener("hyperlink",a.B,!1);b.addEventListener("replaced",a.dd,!1);v(b.M,"visibility","visible");v(b.M,"display","block")}function jr(a,b){hr(a);a.f=b;ir(a,b)}function kr(a){var b=L("reportPosition");Eq(a.g,a.e.H,a.e.ta).then(function(c){var d=a.f;(a.ia&&0<d.g.length?ug(d.g):M(!0)).then(function(){lr(a,d,c).ua(b)})});return N(b)}
function mr(a){var b=a.md;if(a.w){var c=a.w;b.style.marginLeft=c.marginLeft+"px";b.style.marginRight=c.marginRight+"px";b.style.marginTop=c.marginTop+"px";b.style.marginBottom=c.marginBottom+"px";return new sn(a.h,a.fontSize,b,c.width,c.height)}return new sn(a.h,a.fontSize,b)}
function nr(a){if(a.w||!a.viewport||a.viewport.fontSize!=a.fontSize)return!1;var b=mr(a);if(!(b=b.width==a.viewport.width&&b.height==a.viewport.height)&&(b=a.b)){a:{a=a.b.Nb;for(b=0;b<a.length;b++){var c=a[b];if(c)for(var c=c.cb,d=0;d<c.length;d++){var e=c[d];if(e.G&&e.F){a=!0;break a}}}a=!1}b=!a}return b}n.ne=function(a,b,c){if(!this.O&&this.F&&0===b&&0===c){var d="";Object.keys(a).forEach(function(b){d+="@page "+b+"{size:";b=a[b];d+=b.width+"px "+b.height+"px;}"});this.F.textContent=d;this.O=!0}};
function or(a){if(a.b){a.b.vc();for(var b=a.b.Nb,c=0;c<b.length;c++){var d=b[c];if(d)for(var d=d.cb,e;e=d.shift();)e=e.M,e.parentNode.removeChild(e)}}a.F&&(a.F.textContent="",a.O=!1);a.viewport=mr(a);b=a.viewport;v(b.e,"width","");v(b.e,"height","");v(b.d,"width","");v(b.d,"height","");v(b.d,"transform","");a.b=new Jq(a.g,a.viewport,a.qa,a.T,a.ne.bind(a))}
function gr(a,b,c){a.D=!1;if(a.T.$a)return Uq(a.b,a.e,c).Qb(function(c){hr(a);a.j=c;c.left&&(ir(a,c.left),c.right||c.left.M.setAttribute("data-vivliostyle-unpaired-page",!0));c.right&&(ir(a,c.right),c.left||c.right.M.setAttribute("data-vivliostyle-unpaired-page",!0));c=pr(a,c);a.viewport.zoom(c.width,c.height,a.zoom);a.f=b;return M(null)});jr(a,b);a.viewport.zoom(b.e.width,b.e.height,a.zoom);a.f=b;return M(null)}
function pr(a,b){var c=0,d=0;b.left&&(c+=b.left.e.width,d=b.left.e.height);b.right&&(c+=b.right.e.width,d=Math.max(d,b.right.e.height));b.left&&b.right&&(c+=2*a.T.Mb);return{width:c,height:d}}var qr={ye:"fit inside viewport"};function rr(){this.name="RenderingCanceledError";this.message="Page rendering has been canceled";this.stack=Error().stack}t(rr,Error);
function dr(a){if(a.k){var b=a.k;Ze(b,new rr||Error("E_TASK_INTERRUPT"));if(b!==Te&&b.b){b.b.f=!0;var c=new jf(b);b.j="interrupt";b.b=c;b.d.Ta(c)}}a.k=null}
function er(a){a.d=!1;a.D=!1;if(nr(a))return M(!0);br(a,"loading");dr(a);var b=af(Te.d,function(){return Ye("resize",function(c){a.k=b;No.d("render (resize)");or(a);a.e&&(a.e.R=-1);Sq(a.b,a.e).then(function(d){a.e=d.position;gr(a,d.page,!0).then(function(){kr(a).then(function(d){br(a,"interactive");(a.hd?a.b.hd():M(null)).then(function(){a.k===b&&(a.k=null);No.b("render (resize)");br(a,"complete");ar(a,{t:"loaded"});O(c,d)})})})})},function(a,b){if(b instanceof rr)No.b("render (resize)"),u.debug(b.message);
else throw b;})});return M(!0)}function lr(a,b,c){var d=L("sendLocationNotification"),e={t:"nav",first:b.l,last:b.k};Hq(a.g,a.e).then(function(b){e.epage=b;e.epageCount=a.g.u;c&&(e.cfi=c);ar(a,e);O(d,!0)});return N(d)}Zq.prototype.ob=function(){return this.b?this.b.ob(this.e):null};
Zq.prototype.Aa=function(a){var b=this;"complete"!==this.u&&br(this,"loading");if("string"==typeof a.where){switch(a.where){case "next":a=this.T.$a?this.b.he:this.b.nextPage;break;case "previous":a=this.T.$a?this.b.ke:this.b.fd;break;case "last":a=this.b.ce;break;case "first":a=this.b.be;break;default:return M(!0)}if(a){var c=a;a=function(){return c.call(b.b,b.e)}}}else if("number"==typeof a.epage){var d=a.epage;a=function(){return Vq(b.b,d)}}else if("string"==typeof a.url){var e=a.url;a=function(){return Xq(b.b,
e,b.e)}}else return M(!0);var f=L("moveTo");a.call(b.b).then(function(a){var c;if(a){b.e=a.position;var d=L("moveTo.showCurrent");c=N(d);gr(b,a.page).then(function(){kr(b).ua(d)})}else c=M(!0);c.then(function(a){"loading"===b.u&&br(b,"interactive");O(f,a)})});return N(f)};
Zq.prototype.zc=function(a){var b=!!a.autohide;a=a.v;var c=this.b.Ad();if(c){if("show"==a)return M(!0)}else if("hide"==a)return M(!0);if(c)return this.b.vc(),M(!0);var d=this,e=L("showTOC");this.b.zc(b).then(function(a){if(a){if(b){var c=function(){d.b.vc()};a.addEventListener("hyperlink",c,!1);a.M.addEventListener("click",c,!1)}a.addEventListener("hyperlink",d.B,!1)}O(e,!0)});return N(e)};
function sr(a,b){var c=b.a||"";return Ye("runCommand",function(d){var e=a.ma[c];e?e.call(a,b).then(function(){ar(a,{t:"done",a:c});O(d,!0)}):(u.error("No such action:",c),O(d,!0))},function(a,b){u.error(b,"Error during action:",c);O(a,!0)})}function tr(a){return"string"==typeof a?JSON.parse(a):a}
function ur(a,b){var c=tr(b),d=null;$e(function(){var b=L("commandLoop"),f=Te.d;a.B=function(b){var c="#"===b.href.charAt(0)||a.N.some(function(a){return b.href.substr(0,a.length)==a});if(c){b.preventDefault();var d={t:"hyperlink",href:b.href,internal:c};af(f,function(){ar(a,d);return M(!0)})}};qf(function(b){if(a.d)er(a).then(function(){sf(b)});else if(a.D)a.f&&gr(a,a.f).then(function(){sf(b)});else if(c){var e=c;c=null;sr(a,e).then(function(){sf(b)})}else e=L("waitForCommand"),d=hf(e,self),N(e).then(function(){sf(b)})}).ua(b);
return N(b)});a.G=function(){var a=d;a&&(d=null,a.Ta())};a.l=function(b){if(c)return!1;c=tr(b);a.G();return!0};a.h.adapt_command=a.l};Array.b||(Array.b=function(a,b,c){b&&c&&(b=b.bind(c));c=[];for(var d=a.length,e=0;e<d;e++)c[e]=b?b(a[e]):a[e];return c});Object.Xb||(Object.Xb=function(a,b){Object.keys(b).forEach(function(c){a[c]=b[c]});return a});function vr(a){function b(a){return"number"===typeof a?a:null}function c(a){return"string"===typeof a?{url:a,Ua:null,Db:null}:{url:a.url,Ua:b(a.startPage),Db:b(a.skipPagesBefore)}}return Array.isArray(a)?a.map(c):a?[c(a)]:null}function wr(a){var b={};Object.keys(a).forEach(function(c){var d=a[c];switch(c){case "autoResize":b.autoresize=d;break;case "pageBorderWidth":b.pageBorder=d;break;default:b[c]=d}});return b}
function xr(a,b){ka=a.debug;this.e=!1;this.f=a;this.zb=new Zq(a.window||window,a.viewportElement,"main",this.ae.bind(this));this.d={autoResize:!0,fontSize:16,pageBorderWidth:1,renderAllPages:!0,spreadView:!1,zoom:1};b&&this.Ud(b);this.b=new Za;Object.defineProperty(this,"readyState",{get:function(){return this.zb.u}})}n=xr.prototype;n.Ud=function(a){var b=Object.Xb({a:"configure"},wr(a));this.zb.l(b);Object.Xb(this.d,a)};
n.ae=function(a){var b={type:a.t};Object.keys(a).forEach(function(c){"t"!==c&&(b[c]=a[c])});$a(this.b,b)};n.oe=function(a,b){this.b.addEventListener(a,b,!1)};n.re=function(a,b){this.b.removeEventListener(a,b,!1)};n.de=function(a,b,c){a||$a(this.b,{type:"error",content:"No URL specified"});yr(this,a,null,b,c)};n.pe=function(a,b,c){a||$a(this.b,{type:"error",content:"No URL specified"});yr(this,null,a,b,c)};
function yr(a,b,c,d,e){function f(a){if(a)return a.map(function(a){return{url:a.url||null,text:a.text||null}})}d=d||{};var g=f(d.authorStyleSheet),h=f(d.userStyleSheet);e&&Object.Xb(a.d,e);b=Object.Xb({a:b?"loadXML":"loadEPUB",userAgentRootURL:a.f.userAgentRootURL,url:vr(b)||c,document:d.documentObject,fragment:d.fragment,authorStyleSheet:g,userStyleSheet:h},wr(a.d));a.e?a.zb.l(b):(a.e=!0,ur(a.zb,b))}n.ob=function(){return this.zb.ob()};
n.fe=function(a){a:switch(a){case "left":a="ltr"===this.ob()?"previous":"next";break a;case "right":a="ltr"===this.ob()?"next":"previous";break a}this.zb.l({a:"moveTo",where:a})};n.ee=function(a){this.zb.l({a:"moveTo",url:a})};n.qe=function(a){var b;a:{b=this.zb;if(!b.f)throw Error("no page exists.");switch(a){case "fit inside viewport":a=b.T.$a?pr(b,b.j):b.f.e;b=Math.min(b.viewport.width/a.width,b.viewport.height/a.height);break a;default:throw Error("unknown zoom type: "+a);}}return b};
ba("vivliostyle.viewer.Viewer",xr);xr.prototype.setOptions=xr.prototype.Ud;xr.prototype.addListener=xr.prototype.oe;xr.prototype.removeListener=xr.prototype.re;xr.prototype.loadDocument=xr.prototype.de;xr.prototype.loadEPUB=xr.prototype.pe;xr.prototype.getCurrentPageProgression=xr.prototype.ob;xr.prototype.navigateToPage=xr.prototype.fe;xr.prototype.navigateToInternalUrl=xr.prototype.ee;xr.prototype.queryZoomFactor=xr.prototype.qe;ba("vivliostyle.viewer.ZoomType",qr);qr.FIT_INSIDE_VIEWPORT="fit inside viewport";
Jo.call(No,"load_vivliostyle","end",void 0);var zr=16,Ar="ltr";function Br(a){window.adapt_command(a)}function Cr(){Br({a:"moveTo",where:"ltr"===Ar?"previous":"next"})}function Dr(){Br({a:"moveTo",where:"ltr"===Ar?"next":"previous"})}
function Er(a){var b=a.key,c=a.keyIdentifier,d=a.location;if("End"===b||"End"===c)Br({a:"moveTo",where:"last"}),a.preventDefault();else if("Home"===b||"Home"===c)Br({a:"moveTo",where:"first"}),a.preventDefault();else if("ArrowUp"===b||"Up"===b||"Up"===c)Br({a:"moveTo",where:"previous"}),a.preventDefault();else if("ArrowDown"===b||"Down"===b||"Down"===c)Br({a:"moveTo",where:"next"}),a.preventDefault();else if("ArrowRight"===b||"Right"===b||"Right"===c)Dr(),a.preventDefault();else if("ArrowLeft"===
b||"Left"===b||"Left"===c)Cr(),a.preventDefault();else if("0"===b||"U+0030"===c)Br({a:"configure",fontSize:Math.round(zr)}),a.preventDefault();else if("t"===b||"U+0054"===c)Br({a:"toc",v:"toggle",autohide:!0}),a.preventDefault();else if("+"===b||"Add"===b||"U+002B"===c||"U+00BB"===c||"U+004B"===c&&d===KeyboardEvent.b)zr*=1.2,Br({a:"configure",fontSize:Math.round(zr)}),a.preventDefault();else if("-"===b||"Subtract"===b||"U+002D"===c||"U+00BD"===c||"U+004D"===c&&d===KeyboardEvent.b)zr/=1.2,Br({a:"configure",
fontSize:Math.round(zr)}),a.preventDefault()}
function Fr(a){switch(a.t){case "loaded":a=a.viewer;var b=Ar=a.ob();a.md.setAttribute("data-vivliostyle-page-progression",b);a.md.setAttribute("data-vivliostyle-spread-view",a.T.$a);window.addEventListener("keydown",Er,!1);document.body.setAttribute("data-vivliostyle-viewer-status","complete");a=document.getElementById("vivliostyle-page-navigation-left");a.addEventListener("click",Cr,!1);b=document.getElementById("vivliostyle-page-navigation-right");b.addEventListener("click",Dr,!1);[a,b].forEach(function(a){a.setAttribute("data-vivliostyle-ui-state",
"attention");window.setTimeout(function(){a.removeAttribute("data-vivliostyle-ui-state")},1E3)});break;case "nav":(a=a.cfi)&&location.replace(Aa(location.href,Oa(a||"")));break;case "hyperlink":a.internal&&Br({a:"moveTo",url:a.href})}}
ba("vivliostyle.viewerapp.main",function(a){var b=a&&a.fragment||xa("f"),c=a&&a.epubURL||xa("b"),d=a&&a.xmlURL||xa("x"),e=a&&a.defaultPageWidth||xa("w"),f=a&&a.defaultPageHeight||xa("h"),g=a&&a.defaultPageSize||xa("size"),h=a&&a.orientation||xa("orientation"),l=xa("spread"),l=a&&a.spreadView||!!l&&"false"!=l,k=a&&a.viewportElement||document.body;a={a:c?"loadEPUB":"loadXML",url:c||d,autoresize:!0,fragment:b,renderAllPages:!0,userAgentRootURL:a&&a.uaRoot||null,document:a&&a.document||null,userStyleSheet:a&&
a.userStyleSheet||null,spreadView:l,pageBorder:1};var m;if(e&&f)m=e+" "+f;else{switch(g){case "A5":e="148mm";f="210mm";break;case "A4":e="210mm";f="297mm";break;case "A3":e="297mm";f="420mm";break;case "B5":e="176mm";f="250mm";break;case "B4":e="250mm";f="353mm";break;case "letter":e="8.5in";f="11in";break;case "legal":e="8.5in";f="14in";break;case "ledger":e="11in",f="17in"}e&&f&&(m=g,"landscape"===h&&(m=m?m+" landscape":null,g=e,e=f,f=g))}e&&f&&(a.viewport={width:e,height:f},g=document.createElement("style"),
g.textContent="@page { size: "+m+"; margin: 0; }",document.head.appendChild(g));ur(new Zq(window,k,"main",Fr),a)});
    return enclosingObject.vivliostyle;
}.bind(window));


},{}],3:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var supportTouchEvents = ("ontouchstart" in window);

_knockout2["default"].bindingHandlers.menuButton = {
    init: function init(element, valueAccessor) {
        if (_knockout2["default"].unwrap(valueAccessor())) {
            if (supportTouchEvents) {
                element.addEventListener("touchstart", function () {
                    _knockout2["default"].utils.toggleDomNodeCssClass(element, "hover active", true);
                });
                element.addEventListener("touchend", function () {
                    _knockout2["default"].utils.toggleDomNodeCssClass(element, "hover active", false);
                });
            } else {
                element.addEventListener("mouseover", function () {
                    _knockout2["default"].utils.toggleDomNodeCssClass(element, "hover", true);
                });
                element.addEventListener("mousedown", function () {
                    _knockout2["default"].utils.toggleDomNodeCssClass(element, "active", true);
                });
                element.addEventListener("mouseup", function () {
                    _knockout2["default"].utils.toggleDomNodeCssClass(element, "active", false);
                });
                element.addEventListener("mouseout", function () {
                    _knockout2["default"].utils.toggleDomNodeCssClass(element, "hover", false);
                });
            }
        }
    }
};

},{"knockout":1}],4:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _modelsMessageQueue = require("../models/message-queue");

var _modelsMessageQueue2 = _interopRequireDefault(_modelsMessageQueue);

var LogLevel = {
    DEBUG: "debug",
    INFO: "info",
    WARN: "warn",
    ERROR: "error"
};

function Logger() {
    this.logLevel = LogLevel.ERROR;
}

Logger.LogLevel = LogLevel;

Logger.prototype.setLogLevel = function (logLevel) {
    this.logLevel = logLevel;
};

Logger.prototype.debug = function (content) {
    if (this.logLevel === LogLevel.DEBUG) {
        _modelsMessageQueue2["default"].push({
            type: "debug",
            content: content
        });
    }
};

Logger.prototype.info = function (content) {
    if (this.logLevel === LogLevel.DEBUG || this.logLevel === LogLevel.INFO) {
        _modelsMessageQueue2["default"].push({
            type: "info",
            content: content
        });
    }
};

Logger.prototype.warn = function (content) {
    if (this.logLevel === LogLevel.DEBUG || this.logLevel === LogLevel.INFO || this.logLevel === LogLevel.WARN) {
        _modelsMessageQueue2["default"].push({
            type: "warn",
            content: content
        });
    }
};

Logger.prototype.error = function (content) {
    if (this.logLevel === LogLevel.DEBUG || this.logLevel === LogLevel.INFO || this.logLevel === LogLevel.WARN || this.logLevel === LogLevel.ERROR) {
        _modelsMessageQueue2["default"].push({
            type: "error",
            content: content
        });
    }
};

var instance = new Logger();

Logger.getLogger = function () {
    return instance;
};

exports["default"] = Logger;
module.exports = exports["default"];

},{"../models/message-queue":7}],5:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _vivliostyle = require("vivliostyle");

var _vivliostyle2 = _interopRequireDefault(_vivliostyle);

var _modelsVivliostyle = require("./models/vivliostyle");

var _modelsVivliostyle2 = _interopRequireDefault(_modelsVivliostyle);

var _vivliostyleViewer = require("./vivliostyle-viewer");

var _vivliostyleViewer2 = _interopRequireDefault(_vivliostyleViewer);

_modelsVivliostyle2["default"].setInstance(_vivliostyle2["default"]);
_vivliostyleViewer2["default"].start();

},{"./models/vivliostyle":10,"./vivliostyle-viewer":20,"vivliostyle":2}],6:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var _storesUrlParameters = require("../stores/url-parameters");

var _storesUrlParameters2 = _interopRequireDefault(_storesUrlParameters);

var _pageSize = require("./page-size");

var _pageSize2 = _interopRequireDefault(_pageSize);

function getDocumentOptionsFromURL() {
    var epubUrl = _storesUrlParameters2["default"].getParameter("b");
    var url = _storesUrlParameters2["default"].getParameter("x");
    var fragment = _storesUrlParameters2["default"].getParameter("f");
    var style = _storesUrlParameters2["default"].getParameter("style");
    var userStyle = _storesUrlParameters2["default"].getParameter("userStyle");
    return {
        epubUrl: epubUrl[0] || null,
        url: url.length ? url : null,
        fragment: fragment[0] || null,
        authorStyleSheet: style.length ? style : [],
        userStyleSheet: userStyle.length ? userStyle : []
    };
}

function DocumentOptions() {
    var urlOptions = getDocumentOptionsFromURL();
    this.epubUrl = _knockout2["default"].observable(urlOptions.epubUrl || "");
    this.url = _knockout2["default"].observable(urlOptions.url || null);
    this.fragment = _knockout2["default"].observable(urlOptions.fragment || "");
    this.authorStyleSheet = _knockout2["default"].observable(urlOptions.authorStyleSheet);
    this.userStyleSheet = _knockout2["default"].observable(urlOptions.userStyleSheet);
    this.pageSize = new _pageSize2["default"]();

    // write fragment back to URL when updated
    this.fragment.subscribe(function (fragment) {
        var encoded = fragment.replace(/[\s+&?=#\u007F-\uFFFF]+/g, encodeURIComponent);
        _storesUrlParameters2["default"].setParameter("f", encoded);
    });
}

DocumentOptions.prototype.toObject = function () {
    function convertStyleSheetArray(arr) {
        return arr.map(function (url) {
            return { url: url };
        });
    }
    var uss = convertStyleSheetArray(this.userStyleSheet());
    // Do not include url
    // (url is a required argument to Viewer.loadDocument, separated from other options)
    return {
        fragment: this.fragment(),
        authorStyleSheet: convertStyleSheetArray(this.authorStyleSheet()),
        userStyleSheet: [{
            text: "@page {" + this.pageSize.toCSSDeclarationString() + "}"
        }].concat(uss)
    };
};

exports["default"] = DocumentOptions;
module.exports = exports["default"];

},{"../stores/url-parameters":11,"./page-size":8,"knockout":1}],7:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

function MessageQueue() {
  return _knockout2["default"].observableArray();
}

exports["default"] = new MessageQueue();
module.exports = exports["default"];

},{"knockout":1}],8:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var Mode = {
    AUTO: "auto",
    PRESET: "preset",
    CUSTOM: "custom"
};

var PresetSize = [{ name: "A5", description: "A5" }, { name: "A4", description: "A4" }, { name: "A3", description: "A3" }, { name: "B5", description: "B5 (ISO)" }, { name: "B4", description: "B4 (ISO)" }, { name: "JIS-B5", description: "B5 (JIS)" }, { name: "JIS-B4", description: "B4 (JIS)" }, { name: "letter", description: "letter" }, { name: "legal", description: "legal" }, { name: "ledger", description: "ledger" }];

function PageSize(pageSize) {
    this.mode = _knockout2["default"].observable(Mode.AUTO);
    this.presetSize = _knockout2["default"].observable(PresetSize[0]);
    this.isLandscape = _knockout2["default"].observable(false);
    this.customWidth = _knockout2["default"].observable("210mm");
    this.customHeight = _knockout2["default"].observable("297mm");
    this.isImportant = _knockout2["default"].observable(false);
    if (pageSize) {
        this.copyFrom(pageSize);
    }
}

PageSize.Mode = Mode;
PageSize.PresetSize = PageSize.prototype.PresetSize = PresetSize;

PageSize.prototype.copyFrom = function (other) {
    this.mode(other.mode());
    this.presetSize(other.presetSize());
    this.isLandscape(other.isLandscape());
    this.customWidth(other.customWidth());
    this.customHeight(other.customHeight());
    this.isImportant(other.isImportant());
};

PageSize.prototype.equivalentTo = function (other) {
    if (this.isImportant() !== other.isImportant()) {
        return false;
    }
    var mode = this.mode();
    if (other.mode() === mode) {
        switch (mode) {
            case Mode.AUTO:
                return true;
            case Mode.PRESET:
                return this.presetSize() === other.presetSize() && this.isLandscape() === other.isLandscape();
            case Mode.CUSTOM:
                return this.customWidth() === other.customWidth() && this.customHeight() === other.customHeight();
            default:
                throw new Error("Unknown mode " + mode);
        }
    } else {
        return false;
    }
};

PageSize.prototype.toCSSDeclarationString = function () {
    var declaration = "size: ";
    switch (this.mode()) {
        case Mode.AUTO:
            declaration += "auto";
            break;
        case Mode.PRESET:
            declaration += this.presetSize().name;
            if (this.isLandscape()) {
                declaration += " landscape";
            }
            break;
        case Mode.CUSTOM:
            declaration += this.customWidth() + " " + this.customHeight();
            break;
        default:
            throw new Error("Unknown mode " + this.mode());
    }

    if (this.isImportant()) {
        declaration += " !important";
    }

    return declaration + ";";
};

exports["default"] = PageSize;
module.exports = exports["default"];

},{"knockout":1}],9:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var _storesUrlParameters = require("../stores/url-parameters");

var _storesUrlParameters2 = _interopRequireDefault(_storesUrlParameters);

function getViewerOptionsFromURL() {
    return {
        profile: _storesUrlParameters2["default"].getParameter("profile")[0] === "true",
        spreadView: _storesUrlParameters2["default"].getParameter("spread")[0] === "true"
    };
}

function getDefaultValues() {
    return {
        fontSize: 16,
        profile: false,
        spreadView: false,
        zoom: 1
    };
}

function ViewerOptions(options) {
    this.fontSize = _knockout2["default"].observable();
    this.profile = _knockout2["default"].observable();
    this.spreadView = _knockout2["default"].observable();
    this.zoom = _knockout2["default"].observable();
    if (options) {
        this.copyFrom(options);
    } else {
        var defaultValues = getDefaultValues();
        var urlOptions = getViewerOptionsFromURL();
        this.fontSize(defaultValues.fontSize);
        this.profile(urlOptions.profile || defaultValues.profile);
        this.spreadView(urlOptions.spreadView || defaultValues.spreadView);
        this.zoom(defaultValues.zoom);

        // write spread parameter back to URL when updated
        this.spreadView.subscribe(function (spread) {
            _storesUrlParameters2["default"].setParameter("spread", spread);
        });
    }
}

ViewerOptions.prototype.copyFrom = function (other) {
    this.fontSize(other.fontSize());
    this.profile(other.profile());
    this.spreadView(other.spreadView());
    this.zoom(other.zoom());
};

ViewerOptions.prototype.toObject = function () {
    return {
        fontSize: this.fontSize(),
        spreadView: this.spreadView(),
        zoom: this.zoom()
    };
};

ViewerOptions.getDefaultValues = getDefaultValues;

exports["default"] = ViewerOptions;
module.exports = exports["default"];

},{"../stores/url-parameters":11,"knockout":1}],10:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
function Vivliostyle() {
    this.viewer = null;
    this.constants = null;
    this.profile = null;
}

Vivliostyle.prototype.setInstance = function (vivliostyle) {
    this.viewer = vivliostyle.viewer;
    this.constants = vivliostyle.constants;
    this.profile = vivliostyle.profile;
};

exports["default"] = new Vivliostyle();
module.exports = exports["default"];

},{}],11:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _utilsStringUtil = require("../utils/string-util");

var _utilsStringUtil2 = _interopRequireDefault(_utilsStringUtil);

function getRegExpForParameter(name) {
    return new RegExp("[#&]" + _utilsStringUtil2["default"].escapeUnicodeString(name) + "=([^&]*)", "g");
}

function URLParameterStore() {
    this.history = window ? window.history : {};
    this.location = window ? window.location : { url: "" };
}

URLParameterStore.prototype.getParameter = function (name) {
    var url = this.location.href;
    var regexp = getRegExpForParameter(name);
    var results = [];
    var r;
    while (r = regexp.exec(url)) {
        results.push(r[1]);
    }
    return results;
};

URLParameterStore.prototype.setParameter = function (name, value) {
    var url = this.location.href;
    var updated;
    var regexp = getRegExpForParameter(name);
    var r = regexp.exec(url);
    if (r) {
        var l = r[1].length;
        var start = r.index + r[0].length - l;
        updated = url.substring(0, start) + value + url.substring(start + l);
    } else {
        updated = url + (url.match(/#/) ? "&" : "#") + name + "=" + value;
    }
    if (this.history.replaceState) {
        this.history.replaceState(null, "", updated);
    } else {
        this.location.href = updated;
    }
};

exports["default"] = new URLParameterStore();
module.exports = exports["default"];

},{"../utils/string-util":14}],12:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

// cf. http://www.w3.org/TR/DOM-Level-3-Events-key/
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var Keys = {
    Unidentified: "Unidentified",
    ArrowDown: "ArrowDown",
    ArrowLeft: "ArrowLeft",
    ArrowRight: "ArrowRight",
    ArrowUp: "ArrowUp",
    Home: "Home",
    End: "End",
    PageDown: "PageDown",
    PageUp: "PageUp",
    Escape: "Escape"
};

// CAUTION: This function covers only part of common keys on a keyboard. Keys not covered by the implementation are identified as KeyboardEvent.key, KeyboardEvent.keyIdentifier, or "Unidentified".
function identifyKeyFromEvent(event) {
    var key = event.key;
    var keyIdentifier = event.keyIdentifier;
    var location = event.location;
    if (key === Keys.ArrowDown || key === "Down" || keyIdentifier === "Down") {
        return Keys.ArrowDown;
    } else if (key === Keys.ArrowLeft || key === "Left" || keyIdentifier === "Left") {
        return Keys.ArrowLeft;
    } else if (key === Keys.ArrowRight || key === "Right" || keyIdentifier === "Right") {
        return Keys.ArrowRight;
    } else if (key === Keys.ArrowUp || key === "Up" || keyIdentifier === "Up") {
        return Keys.ArrowUp;
    } else if (key === Keys.Escape || key === "Esc" || keyIdentifier === "U+001B") {
        return Keys.Escape;
    } else if (key === "0" || keyIdentifier === "U+0030") {
        return "0";
    } else if (key === "+" || key === "Add" || keyIdentifier === "U+002B" || keyIdentifier === "U+00BB" || keyIdentifier === "U+004B" && location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD /* workaround for Chrome for Windows */) {
            return "+";
        } else if (key === "-" || key === "Subtract" || keyIdentifier === "U+002D" || keyIdentifier === "U+00BD" || keyIdentifier === "U+004D" && location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD /* workaround for Chrome for Windows */) {
            return "-";
        } else {
        return key || keyIdentifier || Keys.Unidentified;
    }
}

exports["default"] = {
    Keys: Keys,
    identifyKeyFromEvent: identifyKeyFromEvent
};
module.exports = exports["default"];

},{}],13:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var util = {
    readonlyObservable: function readonlyObservable(value) {
        var obs = _knockout2["default"].observable(value);
        return {
            getter: _knockout2["default"].pureComputed(function () {
                return obs();
            }),
            value: obs
        };
    }
};

exports["default"] = util;
module.exports = exports["default"];

},{"knockout":1}],14:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports['default'] = {
    escapeUnicodeChar: function escapeUnicodeChar(ch) {
        return '\\u' + (0x10000 | ch.charCodeAt(0)).toString(16).substring(1);
    },
    escapeUnicodeString: function escapeUnicodeString(str) {
        return str.replace(/[^-a-zA-Z0-9_]/g, this.escapeUnicodeChar);
    }
};
module.exports = exports['default'];

},{}],15:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

function MessageDialog(queue) {
    this.list = queue;
    this.visible = _knockout2["default"].pureComputed(function () {
        return queue().length > 0;
    });
}

MessageDialog.prototype.getDisplayMessage = function (errorInfo) {
    var e = errorInfo.error;
    var msg = e && (e.toString() || e.frameTrace || e.stack);
    if (msg) {
        msg = msg.split("\n", 1)[0];
    }
    if (!msg) {
        msg = errorInfo.messages.join("\n");
    }
    return msg;
};

exports["default"] = MessageDialog;
module.exports = exports["default"];

},{"knockout":1}],16:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var _modelsVivliostyle = require("../models/vivliostyle");

var _modelsVivliostyle2 = _interopRequireDefault(_modelsVivliostyle);

var _modelsViewerOptions = require("../models/viewer-options");

var _modelsViewerOptions2 = _interopRequireDefault(_modelsViewerOptions);

var _utilsKeyUtil = require("../utils/key-util");

function Navigation(viewerOptions, viewer, settingsPanel, navigationOptions) {
    this.viewerOptions_ = viewerOptions;
    this.viewer_ = viewer;
    this.settingsPanel_ = settingsPanel;

    this.isDisabled = _knockout2["default"].pureComputed(function () {
        return this.settingsPanel_.opened() || !this.viewer_.state.navigatable();
    }, this);

    var navigationDisabled = _knockout2["default"].pureComputed(function () {
        return navigationOptions.disablePageNavigation || this.isDisabled();
    }, this);

    this.isNavigateToPreviousDisabled = navigationDisabled;
    this.isNavigateToNextDisabled = navigationDisabled;
    this.isNavigateToLeftDisabled = navigationDisabled;
    this.isNavigateToRightDisabled = navigationDisabled;
    this.isNavigateToFirstDisabled = navigationDisabled;
    this.isNavigateToLastDisabled = navigationDisabled;
    this.hidePageNavigation = !!navigationOptions.disablePageNavigation;

    var zoomDisabled = _knockout2["default"].pureComputed(function () {
        return navigationOptions.disableZoom || this.isDisabled();
    }, this);

    this.isZoomOutDisabled = zoomDisabled;
    this.isZoomInDisabled = zoomDisabled;
    this.isZoomDefaultDisabled = zoomDisabled;
    this.hideZoom = !!navigationOptions.disableZoom;

    var fontSizeChangeDisabled = _knockout2["default"].pureComputed(function () {
        return navigationOptions.disableFontSizeChange || this.isDisabled();
    }, this);

    this.isIncreaseFontSizeDisabled = fontSizeChangeDisabled;
    this.isDecreaseFontSizeDisabled = fontSizeChangeDisabled;
    this.isDefaultFontSizeDisabled = fontSizeChangeDisabled;
    this.hideFontSizeChange = !!navigationOptions.disableFontSizeChange;

    ["navigateToPrevious", "navigateToNext", "navigateToLeft", "navigateToRight", "navigateToFirst", "navigateToLast", "zoomIn", "zoomOut", "zoomDefault", "increaseFontSize", "decreaseFontSize", "defaultFontSize", "handleKey"].forEach(function (methodName) {
        this[methodName] = this[methodName].bind(this);
    }, this);
}

Navigation.prototype.navigateToPrevious = function () {
    if (!this.isNavigateToPreviousDisabled()) {
        this.viewer_.navigateToPrevious();
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.navigateToNext = function () {
    if (!this.isNavigateToNextDisabled()) {
        this.viewer_.navigateToNext();
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.navigateToLeft = function () {
    if (!this.isNavigateToLeftDisabled()) {
        this.viewer_.navigateToLeft();
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.navigateToRight = function () {
    if (!this.isNavigateToRightDisabled()) {
        this.viewer_.navigateToRight();
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.navigateToFirst = function () {
    if (!this.isNavigateToFirstDisabled()) {
        this.viewer_.navigateToFirst();
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.navigateToLast = function () {
    if (!this.isNavigateToLastDisabled()) {
        this.viewer_.navigateToLast();
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.zoomIn = function () {
    if (!this.isZoomInDisabled()) {
        var zoom = this.viewerOptions_.zoom();
        this.viewerOptions_.zoom(zoom * 1.25);
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.zoomOut = function () {
    if (!this.isZoomOutDisabled()) {
        var zoom = this.viewerOptions_.zoom();
        this.viewerOptions_.zoom(zoom * 0.8);
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.zoomDefault = function (force) {
    if (force === true || !this.isZoomDefaultDisabled()) {
        var zoom = this.viewer_.queryZoomFactor(_modelsVivliostyle2["default"].viewer.ZoomType.FIT_INSIDE_VIEWPORT);
        this.viewerOptions_.zoom(zoom);
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.increaseFontSize = function () {
    if (!this.isIncreaseFontSizeDisabled()) {
        var fontSize = this.viewerOptions_.fontSize();
        this.viewerOptions_.fontSize(fontSize * 1.25);
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.decreaseFontSize = function () {
    if (!this.isDecreaseFontSizeDisabled()) {
        var fontSize = this.viewerOptions_.fontSize();
        this.viewerOptions_.fontSize(fontSize * 0.8);
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.defaultFontSize = function () {
    if (!this.isDefaultFontSizeDisabled()) {
        var fontSize = _modelsViewerOptions2["default"].getDefaultValues().fontSize;
        this.viewerOptions_.fontSize(fontSize);
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.handleKey = function (key) {
    switch (key) {
        case _utilsKeyUtil.Keys.ArrowDown:
        case _utilsKeyUtil.Keys.PageDown:
            return !this.navigateToNext();
        case _utilsKeyUtil.Keys.ArrowLeft:
            return !this.navigateToLeft();
        case _utilsKeyUtil.Keys.ArrowRight:
            return !this.navigateToRight();
        case _utilsKeyUtil.Keys.ArrowUp:
        case _utilsKeyUtil.Keys.PageUp:
            return !this.navigateToPrevious();
        case _utilsKeyUtil.Keys.Home:
            return !this.navigateToFirst();
        case _utilsKeyUtil.Keys.End:
            return !this.navigateToLast();
        case "+":
            return !this.increaseFontSize();
        case "-":
            return !this.decreaseFontSize();
        case "0":
            return !this.defaultFontSize();
        default:
            return true;
    }
};

exports["default"] = Navigation;
module.exports = exports["default"];

},{"../models/viewer-options":9,"../models/vivliostyle":10,"../utils/key-util":12,"knockout":1}],17:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var _modelsViewerOptions = require("../models/viewer-options");

var _modelsViewerOptions2 = _interopRequireDefault(_modelsViewerOptions);

var _modelsPageSize = require("../models/page-size");

var _modelsPageSize2 = _interopRequireDefault(_modelsPageSize);

var _utilsKeyUtil = require("../utils/key-util");

function SettingsPanel(viewerOptions, documentOptions, viewer, messageDialog, settingsPanelOptions) {
    this.viewerOptions_ = viewerOptions;
    this.documentOptions_ = documentOptions;
    this.viewer_ = viewer;

    this.isPageSizeChangeDisabled = !!settingsPanelOptions.disablePageSizeChange;
    this.isOverrideDocumentStyleSheetDisabled = this.isPageSizeChangeDisabled;
    this.isSpreadViewChangeDisabled = !!settingsPanelOptions.disableSpreadViewChange;

    this.opened = _knockout2["default"].observable(false);
    this.state = {
        viewerOptions: new _modelsViewerOptions2["default"](viewerOptions),
        pageSize: new _modelsPageSize2["default"](documentOptions.pageSize)
    };

    ["close", "toggle", "apply", "reset"].forEach(function (methodName) {
        this[methodName] = this[methodName].bind(this);
    }, this);

    messageDialog.visible.subscribe(function (visible) {
        if (visible) this.close();
    }, this);
}

SettingsPanel.prototype.close = function () {
    this.opened(false);
    return true;
};

SettingsPanel.prototype.toggle = function () {
    this.opened(!this.opened());
};

SettingsPanel.prototype.apply = function () {
    if (this.state.pageSize.equivalentTo(this.documentOptions_.pageSize)) {
        this.viewerOptions_.copyFrom(this.state.viewerOptions);
    } else {
        this.documentOptions_.pageSize.copyFrom(this.state.pageSize);
        this.viewer_.loadDocument(this.documentOptions_, this.state.viewerOptions);
    }
};

SettingsPanel.prototype.reset = function () {
    this.state.viewerOptions.copyFrom(this.viewerOptions_);
    this.state.pageSize.copyFrom(this.documentOptions_.pageSize);
};

SettingsPanel.prototype.handleKey = function (key) {
    switch (key) {
        case _utilsKeyUtil.Keys.Escape:
            this.close();
            return true;
        default:
            return true;
    }
};

exports["default"] = SettingsPanel;
module.exports = exports["default"];

},{"../models/page-size":8,"../models/viewer-options":9,"../utils/key-util":12,"knockout":1}],18:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var _modelsVivliostyle = require("../models/vivliostyle");

var _modelsVivliostyle2 = _interopRequireDefault(_modelsVivliostyle);

var _modelsDocumentOptions = require("../models/document-options");

var _modelsDocumentOptions2 = _interopRequireDefault(_modelsDocumentOptions);

var _modelsViewerOptions = require("../models/viewer-options");

var _modelsViewerOptions2 = _interopRequireDefault(_modelsViewerOptions);

var _modelsMessageQueue = require("../models/message-queue");

var _modelsMessageQueue2 = _interopRequireDefault(_modelsMessageQueue);

var _viewer = require("./viewer");

var _viewer2 = _interopRequireDefault(_viewer);

var _navigation = require("./navigation");

var _navigation2 = _interopRequireDefault(_navigation);

var _settingsPanel = require("./settings-panel");

var _settingsPanel2 = _interopRequireDefault(_settingsPanel);

var _messageDialog = require("./message-dialog");

var _messageDialog2 = _interopRequireDefault(_messageDialog);

var _utilsKeyUtil = require("../utils/key-util");

var _utilsKeyUtil2 = _interopRequireDefault(_utilsKeyUtil);

var _storesUrlParameters = require("../stores/url-parameters");

var _storesUrlParameters2 = _interopRequireDefault(_storesUrlParameters);

function ViewerApp() {
    this.documentOptions = new _modelsDocumentOptions2["default"]();
    this.viewerOptions = new _modelsViewerOptions2["default"]();
    if (this.viewerOptions.profile()) {
        _modelsVivliostyle2["default"].profile.profiler.enable();
    }
    this.viewerSettings = {
        userAgentRootURL: "resources/",
        viewportElement: document.getElementById("vivliostyle-viewer-viewport"),
        debug: _storesUrlParameters2["default"].getParameter("debug")[0] === "true"
    };
    this.viewer = new _viewer2["default"](this.viewerSettings, this.viewerOptions);
    this.messageDialog = new _messageDialog2["default"](_modelsMessageQueue2["default"]);

    var settingsPanelOptions = {
        disablePageSizeChange: false,
        disableSpreadViewChange: false
    };

    this.settingsPanel = new _settingsPanel2["default"](this.viewerOptions, this.documentOptions, this.viewer, this.messageDialog, settingsPanelOptions);

    var navigationOptions = {
        disablePageNavigation: false,
        disableZoom: false,
        disableFontSizeChange: false
    };

    this.navigation = new _navigation2["default"](this.viewerOptions, this.viewer, this.settingsPanel, navigationOptions);

    this.handleKey = (function (data, event) {
        var key = _utilsKeyUtil2["default"].identifyKeyFromEvent(event);
        var ret = this.settingsPanel.handleKey(key);
        if (ret) {
            ret = this.navigation.handleKey(key);
        }
        return ret;
    }).bind(this);

    this.setDefaultView();

    this.viewer.loadDocument(this.documentOptions);
}

ViewerApp.prototype.setDefaultView = function () {
    var status = this.viewer.state.status();
    this.viewer.state.status.subscribe(function (newStatus) {
        var finished = false;
        var oldStatus = status;
        status = newStatus;
        if (oldStatus === "loading" && newStatus !== "loading") {
            // After document loaded, zoom to the default size
            finished = this.navigation.zoomDefault(true);
        } else if (newStatus === "loading") {
            finished = false;
        }
    }, this);
};

exports["default"] = ViewerApp;
module.exports = exports["default"];

},{"../models/document-options":6,"../models/message-queue":7,"../models/viewer-options":9,"../models/vivliostyle":10,"../stores/url-parameters":11,"../utils/key-util":12,"./message-dialog":15,"./navigation":16,"./settings-panel":17,"./viewer":19,"knockout":1}],19:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var _utilsObservableUtil = require("../utils/observable-util");

var _utilsObservableUtil2 = _interopRequireDefault(_utilsObservableUtil);

var _loggingLogger = require("../logging/logger");

var _loggingLogger2 = _interopRequireDefault(_loggingLogger);

var _modelsVivliostyle = require("../models/vivliostyle");

var _modelsVivliostyle2 = _interopRequireDefault(_modelsVivliostyle);

function Viewer(viewerSettings, viewerOptions) {
    this.viewerOptions_ = viewerOptions;
    this.documentOptions_ = null;
    this.viewer_ = new _modelsVivliostyle2["default"].viewer.Viewer(viewerSettings, viewerOptions.toObject());
    var state_ = this.state_ = {
        status: _utilsObservableUtil2["default"].readonlyObservable(_modelsVivliostyle2["default"].constants.ReadyState.LOADING),
        pageProgression: _utilsObservableUtil2["default"].readonlyObservable(_modelsVivliostyle2["default"].constants.LTR)
    };
    this.state = {
        status: state_.status.getter.extend({
            rateLimit: { timeout: 100, method: "notifyWhenChangesStop" }
        }),
        navigatable: _knockout2["default"].pureComputed(function () {
            return state_.status.value() !== _modelsVivliostyle2["default"].constants.ReadyState.LOADING;
        }),
        pageProgression: state_.pageProgression.getter
    };

    this.setupViewerEventHandler();
    this.setupViewerOptionSubscriptions();
}

Viewer.prototype.setupViewerEventHandler = function () {
    var logger = _loggingLogger2["default"].getLogger();
    this.viewer_.addListener("debug", function (payload) {
        logger.debug(payload.content);
    });
    this.viewer_.addListener("info", function (payload) {
        logger.info(payload.content);
    });
    this.viewer_.addListener("warn", function (payload) {
        logger.warn(payload.content);
    });
    this.viewer_.addListener("error", function (payload) {
        logger.error(payload.content);
    });
    this.viewer_.addListener("readystatechange", (function () {
        this.state_.status.value(this.viewer_.readyState);
    }).bind(this));
    this.viewer_.addListener("loaded", (function () {
        this.state_.pageProgression.value(this.viewer_.getCurrentPageProgression());
        if (this.viewerOptions_.profile()) {
            _modelsVivliostyle2["default"].profile.profiler.printTimings();
        }
    }).bind(this));
    this.viewer_.addListener("nav", (function (payload) {
        var cfi = payload.cfi;
        if (cfi) {
            this.documentOptions_.fragment(cfi);
        }
    }).bind(this));
    this.viewer_.addListener("hyperlink", (function (payload) {
        if (payload.internal) {
            this.viewer_.navigateToInternalUrl(payload.href);
        } else {
            window.location.href = payload.href;
        }
    }).bind(this));
};

Viewer.prototype.setupViewerOptionSubscriptions = function () {
    _knockout2["default"].computed(function () {
        var viewerOptions = this.viewerOptions_.toObject();
        this.viewer_.setOptions(viewerOptions);
    }, this).extend({ rateLimit: 0 });
};

Viewer.prototype.loadDocument = function (documentOptions, viewerOptions) {
    this.state_.status.value("loading");
    if (viewerOptions) {
        this.viewerOptions_.copyFrom(viewerOptions);
    }
    this.documentOptions_ = documentOptions;
    if (documentOptions.url()) {
        this.viewer_.loadDocument(documentOptions.url(), documentOptions.toObject(), this.viewerOptions_.toObject());
    } else if (documentOptions.epubUrl()) {
        this.viewer_.loadEPUB(documentOptions.epubUrl(), documentOptions.toObject(), this.viewerOptions_.toObject());
    }
};

Viewer.prototype.navigateToPrevious = function () {
    this.viewer_.navigateToPage("previous");
};

Viewer.prototype.navigateToNext = function () {
    this.viewer_.navigateToPage("next");
};

Viewer.prototype.navigateToLeft = function () {
    this.viewer_.navigateToPage("left");
};

Viewer.prototype.navigateToRight = function () {
    this.viewer_.navigateToPage("right");
};

Viewer.prototype.navigateToFirst = function () {
    this.viewer_.navigateToPage("first");
};

Viewer.prototype.navigateToLast = function () {
    this.viewer_.navigateToPage("last");
};

Viewer.prototype.queryZoomFactor = function (type) {
    return this.viewer_.queryZoomFactor(type);
};

exports["default"] = Viewer;
module.exports = exports["default"];

},{"../logging/logger":4,"../models/vivliostyle":10,"../utils/observable-util":13,"knockout":1}],20:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var _bindingsMenuButtonJs = require("./bindings/menuButton.js");

var _bindingsMenuButtonJs2 = _interopRequireDefault(_bindingsMenuButtonJs);

var _viewmodelsViewerApp = require("./viewmodels/viewer-app");

var _viewmodelsViewerApp2 = _interopRequireDefault(_viewmodelsViewerApp);

exports["default"] = {
    start: function start() {
        function startViewer() {
            _knockout2["default"].applyBindings(new _viewmodelsViewerApp2["default"]());
        }

        if (window["__loaded"]) startViewer();else window.onload = startViewer;
    }
};
module.exports = exports["default"];

},{"./bindings/menuButton.js":3,"./viewmodels/viewer-app":18,"knockout":1}]},{},[5]);