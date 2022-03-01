(()=>{"use strict";class t extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"})}connectedCallback(){this._lang="javascript",this._editable=this.getAttribute("editable"),this._styledBlock=this.getAttribute("styled-block")||"pre",this._div=document.createElement("div"),this._preBlock=this._div.appendChild(document.createElement("pre")),this._codeBlock=this._preBlock.appendChild(document.createElement("code")),this._div.classList.add("line-numbers"),this._lang&&(this._preBlock.classList.add("language-"+this._lang),this._codeBlock.classList.add("language-"+this._lang)),this._contentSlot=document.createElement("slot"),this._contentSlot.setAttribute("aria-hidden","true"),this._contentSlot.setAttribute("hidden","true"),this._contentSlot.addEventListener("slotchange",(()=>{let t=this._contentSlot.assignedNodes().reduce(((t,e)=>t+(e.outerHTML||e.nodeValue||"")),"");this._textarea&&(this._textarea.value=t),this._updateCodeBlock((t=>t.replace(new RegExp("&","g"),"&amp;").replace(new RegExp("<","g"),"&lt;"))(t))})),"true"===this._editable&&this._addEditor(),this.shadowRoot.append(this._contentSlot,this._textarea||"",this._div),[].concat(this.css).forEach((t=>{if(t.includes("{")&&t.includes(":")&&t.includes(";"))this.shadowRoot.appendChild(document.createElement("style")).textContent=t;else{let e=this.shadowRoot.appendChild(document.createElement("link"));e.setAttribute("rel","stylesheet"),e.setAttribute("href",t)}}))}_addEditor(){this._placeholder=this.getAttribute("placeholder"),this._name=this.getAttribute("name"),this._textarea=this._div.appendChild(document.createElement("textarea")),this._textarea.placeholder=this._placeholder||this._lang,this._textarea.spellcheck=!1,this._textarea.name=this._name||"",this._textarea.value=this._codeBlock.textContent,this._preBlock.setAttribute("aria-hidden","true"),this._scrollBlock="pre"===this.getAttribute("scroll-block")?this._preBlock:this._codeBlock,this._textarea.addEventListener("input",(t=>this._updateCodeBlock(t.target.value))),this._textarea.addEventListener("input",(()=>this._syncScrolling())),this._textarea.addEventListener("keydown",(t=>this._normalizeTabbing(t)))}_normalizeTabbing(t){if(!this._textarea)return;if("Tab"!==t.key)return;t.preventDefault();let e=this._textarea.value,i=this._textarea.selectionStart,n=this._textarea.selectionEnd;if(i===n){let t=e.slice(0,i),r=e.slice(n,e.length),s=n+1;this._textarea.value=t+"\t"+r,this._textarea.selectionStart=s,this._textarea.selectionEnd=s}else{let r=e.split("\n"),s=0,a=0,o=0;for(let e=0;e<r.length;e++)s+=r[e].length,i<s&&n>s-r[e].length&&(t.shiftKey?"\t"===r[e][0]&&(r[e]=r[e].slice(1),0===a&&o--,a--):(r[e]="\t"+r[e],0===a&&o++,a++));this._textarea.value=r.join("\n"),this._textarea.selectionStart=i+o,this._textarea.selectionEnd=n+a}this._updateCodeBlock(this._textarea.value)}_syncScrolling(){this._scrollBlock&&(this._scrollBlock.scrollTop=this._textarea.scrollTop,this._scrollBlock.scrollLeft=this._textarea.scrollLeft)}_updateCodeBlock(t){if(t.endsWith("\n")&&(t+=" "),this._codeBlock.textContent!==t)return this._codeBlock.innerHTML="",this._codeBlock.innerHTML=t,this._highlightCodeBlock(),this._syncScrolling(),!0}_highlightCodeBlock(){Prism.highlightElement(this._codeBlock)}disconnectedCallback(){Array.from(this.shadowRoot.childNodes).forEach((t=>t.remove()))}attributeChangedCallback(t,e,i){if(this.childNodes.length)switch(t){case"name":this._name=i,this._textarea.name=i;break;case"placeholder":this._placeholder=i,this._textarea.placeholder=i;break;case"editable":this._editable=i,this._textarea&&"false"===i?this._textarea.disabled=!0:this._textarea||"true"!==i||this._addEditor()}}static get observedAttributes(){return["name","editable","placeholder"]}get name(){return this._name}set name(t){return this.setAttribute("name",t)}get placeholder(){return this._placeholder}set placeholder(t){return this.setAttribute("placeholder",t)}get editable(){return this._editable}set editable(t){return this.setAttribute("editable",t)}get css(){return["http://localhost:4000/prism.css","http://localhost:4000/vs-code-dark.css",`\n            * {\n                -webkit-box-sizing: border-box;\n                -moz-box-sizing: border-box;\n                box-sizing: border-box;\n            }\n            :host {\n                /* Allow other elems to be inside */\n                position: relative;\n                top: 0;\n                left: 0;\n                display: block;\n            \n                /* Normal inline styles */\n            \n                font-size: 1rem;\n                font-family: monospace;\n                line-height: 1.3rem;\n                tab-size: 2;\n                caret-color: darkgrey;\n                white-space: pre;\n            }\n            \n            textarea, ${this._styledBlock} {\n                /* Both elements need the same text and space styling so they are directly on top of each other */\n                margin: 0px !important;\n                padding-top: var(--vertical-padding, 1.5rem) !important;\n                padding-bottom: var(--vertical-padding, 1.5rem) !important;\n                padding-left: var(--horizontal-padding, 1rem) !important;\n                padding-right: var(--horizontal-padding, 1rem) !important;\n                border: 0 !important;\n                width: 100% !important;\n                height: 100% !important;\n            }\n            ${"code"===this._styledBlock?"pre":"code"} {\n                margin: 0px !important;\n                border: 0px !important;\n                padding: 0px !important;\n                overflow: auto !important;\n                width: 100% !important;\n                height: 100% !important;\n            }\n            .line-numbers :is(textarea, pre[class*=language-]) {\n                padding-left:3.8rem !important;\n            }\n            textarea, pre, pre * {\n                /* Also add text styles to highlighing tokens */\n                font-size: inherit !important;\n                font-family: inherit !important;\n                line-height: inherit !important;\n                tab-size: inherit !important;\n            }\n            \n            \n            textarea, pre {\n                /* In the same place */\n                position: absolute;\n                top: 0;\n                left: 0;\n            }\n            textarea[disabled] {\n                pointer-events: none !important;\n            }\n            \n            \n            /* Move the textarea in front of the result */\n            \n            textarea {\n                z-index: 1;\n            }\n            pre {\n                z-index: 0;\n            }\n            \n            \n            /* Make textarea almost completely transparent */\n            \n            textarea {\n                color: transparent;\n                background: transparent;\n                caret-color: inherit!important; /* Or choose your favourite color */\n            }\n            \n            /* Can be scrolled */\n            textarea, pre {\n                overflow: auto !important;\n            \n                white-space: inherit !important;\n                word-spacing: normal !important;\n                word-break: normal !important;\n                word-wrap: normal !important;\n            }\n            \n            /* No resize on textarea; stop outline */\n            textarea {\n                resize: none;\n                outline: none !important;\n            }\n            .line-numbers-rows {\n                border: none !important;\n                color: dimgray !important;\n            }\n            `]}}const e=t=>class extends(t||class{}){setStateCallback(t,e,i,n=100,r){this._timeouts||(this._timeouts={}),t in this._timeouts||(this._timeouts[t]=[]),i?(this._timeouts[t].length||r(),n?this._timeouts[t].unshift(setTimeout((()=>this.setState(t,e,!1)),n)):this._timeouts[t].unshift(null),this._related&&this._related.setState(t,e,!0,n)):(this._timeouts[t].shift(),this._timeouts[t].length||(r(),this._related&&this._related.setState(t,e,!1)))}};class i extends(e()){constructor(t,e){super(),Object.assign(this,t),this._observerBlocks=e,this.on("mouseenter",(()=>{this.setState("block","hover",!0,0)})).on("mouseleave",(()=>{this.setState("block","hover",!1)})),this.anchor.setAttribute("title",`(${this.id}) Observer Block`)}setState(t,e,i,n=100){i&&this.parentId&&this._observerBlocks[this.parentId]&&this._observerBlocks[this.parentId].setState(t,e,!1),this.setStateCallback(t,e,i,n,(()=>{i?this.anchor.classList.add(`${t}-${e}`):this.anchor.classList.remove(`${t}-${e}`)}))}on(t,e){return this.anchor.addEventListener(t,e.bind(this)),this}}class n extends(e(Array)){constructor(...t){super(...t),this.forEach((t=>{t.ownerPath=this,t.anchor.setAttribute("title","effect-path-identifier"===t.anchorTyoe?"Effect Path/Identifier":"Observed Path/Identifier")})),this.on("mouseenter",(()=>{this.setState("path","hover",!0,0)})).on("mouseleave",(()=>{this.setState("path","hover",!1)}))}setState(t,e,i,n=100){this.setStateCallback(t,e,i,n,(()=>{i?this.forEach((i=>i.anchor.classList.add(`${t}-${e}`))):this.forEach((i=>i.anchor.classList.remove(`${t}-${e}`)))}))}on(t,e){return this.forEach((i=>i.anchor.addEventListener(t,e.bind(this)))),this}}customElements.define("subscript-codeblock",t),customElements.define("subscript-visualizer",class extends t{constructor(){super(),this._effectsTree={},this._observerBlocks={},this._anchorsMap=new Map}_updateCodeBlock(t){super._updateCodeBlock(t)&&this._prepareVisualization()}visualize(t,e){t.forEach((t=>{this._anchorsMap.get(t.path[0].id).ownerPath.setState("path-runtime","active",!0,600)})),e&&this._observerBlocks[e].setState("block-runtime","active",!0,600)}setVisualization(t){this._visualizationData=t,t.originalSource&&(this.innerHTML=t.originalSource)}_prepareVisualization(){if(!this._visualizationData||!this._codeBlock.textContent.length)return;let t=(t,e,i=[])=>new n(...e.map((e=>this._createAnchor(t+"-identifier",{...e}))),...i);this._textNodes=this._getTextNodes(),Object.keys(this._visualizationData.effects).forEach((e=>{this._visualizationData.effects[e].forEach((e=>{e.meta.destructuringTrail&&(e.meta={...e.meta,destructuringTrail:t("destructuring-trail",e.meta.destructuringTrail)}),this._effectsTree[e.id]=this._effectsTree[e.id]||[],this._effectsTree[e.id].push({...e,path:"globals"===e.id?e.path:t("effect-path",e.path),observers:Object.keys(e.observers).reduce(((i,n)=>(e.observers[n].forEach((e=>{let r;["DeclaratorInit","AssignmentRight"].includes(e.meta.role)&&this._effectsTree[e.meta.effectId]&&(r=this._effectsTree[e.meta.effectId][0].meta.destructuringTrail),i[n]=i[n]||[],i[n].push({...e,path:t("observer-path",e.path,r)})})),i)),{})})}))})),this._textNodes=this._getTextNodes(),Object.keys(this._visualizationData.observers).forEach((t=>{let e=this._visualizationData.observers[t],n=new i(this._createAnchor("observer-block",{...e}),this._observerBlocks);this._observerBlocks[e.id]=n}))}_createAnchor(t,e){let[i,n]=this._visualizationData.idLocs["#"+e.id],[r,s]=this._resolveOffset(i),[a,o]=this._resolveOffset(n,!1),l=new Range;return e.anchor=document.createElement("span"),e.anchor.classList.add(t),e.anchorTyoe=t,this._anchorsMap.set(e.id,e),"observer-block"===t?(0===s&&"SPAN"===r.parentNode.nodeName?l.setStartBefore(r.parentNode):l.setStart(r,s),o===(a.nodeValue||"").length&&"SPAN"===a.parentNode.nodeName?l.setEndAfter(a.parentNode):l.setEnd(a,o)):(l.setStart(r,s),l.setEnd(a,o)),l.surroundContents(e.anchor),e}_resolveOffset(t,e=!0){return this._textNodes.reduce((([i,n,r],s)=>{if(null===n){let a=r+s.length;if(t<=a&&!s.isBlank){let n=t-r;if(!e&&0===n)return[i.node,i.length];if(!e||n<s.length)return[s.node,n]}[i,n,r]=[s,n,a]}return[i,n,r]}),[null,null,0])}_getTextNodes(){let t,e={acceptNode:function(t){if("SCRIPT"!==t.parentNode.nodeName)return window.NodeFilter.FILTER_ACCEPT}},i=window.document.createTreeWalker(this._codeBlock,window.NodeFilter.SHOW_TEXT,e,!1),n=[];for(;t=i.nextNode();){let e=t.nodeValue||"";n.push({node:t,length:e.length,isBlank:0===e.trim().length})}return n}get css(){return super.css.concat(["\n            .effect-path-identifier {\n                cursor: pointer;\n            }\n            \n            .destructuring-trail-identifier,\n            .observer-path-identifier {\n                cursor: default;\n            }\n\n            .effect-path-identifier:is(.path-hover, .path-runtime-active) {\n                color: violet;\n                font-style: italic;\n            }\n            .effect-path-identifier.path-runtime-active {\n                font-style: normal;\n                text-decoration: underline;\n            }\n\n            :is(.destructuring-trail-identifier, .observer-path-identifier):is(.path-hover, .path-runtime-active) {\n                color: aqua;\n                font-style: italic;\n            }\n            .token.keyword .observer-path-identifier:is(.path-hover, .path-runtime-active) {\n                color: mediumturquoise;\n            }\n            :is(.destructuring-trail-identifier, .observer-path-identifier).path-runtime-active {\n                font-style: normal;\n                text-decoration: underline;\n            }\n\n            .observer-block.block-hover,\n            .observer-block.block-runtime-active {\n                outline: 1px dashed gray;\n                outline-offset: 0.3rem;\n                border-radius: 0.3rem;\n            }\n            .observer-block.block-runtime-active {\n                background-color: rgba(100, 100, 100, 0.25);\n            }\n            "])}})})();
//# sourceMappingURL=ui.js.map