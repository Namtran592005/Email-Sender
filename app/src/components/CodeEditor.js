import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { WebView } from 'react-native-webview';

function buildCodeHtml(initial) {
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
html,body{margin:0;padding:0;height:100%;background:#1e1e1e;}
.wrap{position:relative;height:100%;overflow:hidden;}
#hl{margin:0;padding:14px 18px 40px;font-family:Menlo,Consolas,'SFMono-Regular','Droid Sans Mono','Courier New',monospace;font-size:15px;line-height:1.7;color:#d4d4d4;white-space:pre;position:absolute;top:0;left:0;right:0;bottom:0;overflow:auto;pointer-events:none;word-wrap:normal;letter-spacing:.2px;}
#ta{border:0;outline:none;resize:none;background:transparent;-webkit-text-fill-color:transparent;caret-color:#f8f8f2;color:transparent;font-family:Menlo,Consolas,'SFMono-Regular','Droid Sans Mono','Courier New',monospace;font-size:15px;line-height:1.7;white-space:pre;position:absolute;top:0;left:0;right:0;bottom:0;overflow:auto;padding:14px 18px 40px;word-wrap:normal;letter-spacing:.2px;}
.t{color:#569cd6;} .a{color:#9cdcfe;} .v{color:#ce9178;} .s{color:#ce9178;} .c{color:#6a9955;} .n{color:#b5cea8;} .p{color:#d4d4d4;}
</style></head>
<body><div class="wrap">
<pre id="hl"></pre>
<textarea id="ta" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" wrap="off"></textarea>
</div>
<script>
var ta = document.getElementById('ta');
var hl = document.getElementById('hl');
function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function color(src){
  var out = '', i = 0, n = src.length;
  while (i < n) {
    if (src.substr(i,4) === '<!--') {
      var ce = src.indexOf('-->', i); ce = ce < 0 ? n : ce + 3;
      out += '<span class="c">' + esc(src.substring(i, ce)) + '</span>'; i = ce; continue;
    }
    var c = src[i];
    if (c === '<') {
      i++; out += '<span class="p">&lt;</span>';
      if (src[i] === '!') {
        var gt = src.indexOf('>', i); gt = gt < 0 ? n : gt + 1;
        out += '<span class="a">' + esc(src.substring(i, gt)) + '</span>'; i = gt; continue;
      }
      if (src[i] === '/') { out += esc(src[i]); i++; }
      var tm = /^[a-zA-Z][\w-]*/.exec(src.substr(i));
      if (tm) { out += '<span class="t">' + tm[0] + '</span>'; i += tm[0].length; }
      while (i < n && src[i] !== '>') {
        if (/\s/.test(src[i])) { out += esc(src[i]); i++; continue; }
        if (src[i] === '=') { out += '<span class="p">=</span>'; i++; continue; }
        if (src[i] === '"' || src[i] === "'") {
          var q = src[i], qe = src.indexOf(q, i + 1); qe = qe < 0 ? n : qe;
          out += '<span class="v">' + esc(src.substring(i, qe + 1)) + '</span>'; i = qe + 1; continue;
        }
        var am = /^[^\s=>]+/.exec(src.substr(i));
        if (am) { out += '<span class="a">' + am[0] + '</span>'; i += am[0].length; continue; }
        out += esc(src[i]); i++;
      }
      if (i < n) { out += '<span class="p">&gt;</span>'; i++; }
      continue;
    }
    if (c === '&') { out += esc(c); i++; continue; }
    var next = src.indexOf('<', i);
    if (next < 0) next = n;
    out += esc(src.substring(i, next));
    i = next;
  }
  return out;
}
function render(){
  hl.innerHTML = color(ta.value) + '\\n';
  hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft;
}
window.setValue = function (v) { ta.value = v; render(); };
ta.addEventListener('input', function () {
  render();
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('CODE:' + ta.value);
});
ta.addEventListener('scroll', function () { hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft; });
ta.value = ${JSON.stringify(initial)};
render();
ta.focus();
</script></body></html>`;
}

const CodeEditor = forwardRef(function CodeEditor({ initialValue = '', onChange, style }, ref) {
  const webRef = useRef(null);
  const src = useRef(buildCodeHtml(initialValue)).current;

  useImperativeHandle(ref, () => ({
    setValue: (v) => {
      if (webRef.current) webRef.current.injectJavaScript(`window.setValue(${JSON.stringify(v)});`);
    },
  }));

  return (
    <WebView
      ref={webRef}
      style={style}
      originWhitelist={['*']}
      source={{ html: src }}
      onMessage={(e) => {
        const data = e.nativeEvent.data;
        if (data && data.startsWith('CODE:')) onChange && onChange(data.slice(5));
      }}
      javaScriptEnabled
      domStorageEnabled
      keyboardDisplayRequiresUserAction={false}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      androidLayerType="none"
    />
  );
});

export default CodeEditor;