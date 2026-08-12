import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { WebView } from 'react-native-webview';

const CSS = `html,body{margin:0;padding:0;background:#ffffff;color:#282522;-webkit-text-size-adjust:100%}
#editable{outline:none;padding:18px 20px 80px;min-height:100vh;box-sizing:border-box;font-family:-apple-system,Roboto,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:17px;line-height:1.7;color:#282522}
#editable a{color:#c9913b}
#editable .title{font-size:25px;line-height:1.3;font-weight:700;letter-spacing:-.3px;color:#282522;margin:6px 0 4px}
#editable .underline{display:none}
#editable .letter p{margin:0 0 14px}
#editable .closing{margin-top:12px}
#editable .closing strong{font-weight:700}
#editable h2{font-size:20px;font-weight:700;margin:14px 0 6px;color:#282522}
#editable blockquote{margin:12px 0;padding:10px 16px;border-left:3px solid #eab63d;color:#514a43;font-style:italic}
#editable ul,#editable ol{margin:10px 0;padding-left:22px}
#editable li{margin-bottom:4px}`;

export function buildEditorHtml(body) {
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><style>${CSS}</style></head><body>
<div id="editable" contenteditable="true" spellcheck="true">${body}</div>
<script>
(function () {
  var el = document.getElementById('editable');
  var hist = [];
  var histCap = 40;
  function cmdState(name) { try { return !!document.queryCommandState(name); } catch (e) { return false; } }
  function blockTag() {
    var v = null;
    try { v = document.queryCommandValue('formatBlock') || ''; } catch (e) { return ''; }
    return String(v).replace(/<|>|\//g, '').trim().toLowerCase();
  }
  function ancestorsFormat(startNode) {
    var b=false, i=false, u=false, s=false;
    var node = startNode;
    for (var n = 0; node && node !== el && node.nodeType === 1 && n < 12; n++) {
      var tag = (node.nodeName || '').toLowerCase();
      if (tag === 'b' || tag === 'strong') b = true;
      if (tag === 'i' || tag === 'em') i = true;
      if (tag === 'u') u = true;
      if (tag === 's' || tag === 'strike' || tag === 'del') s = true;
      node = node.parentNode;
    }
    return { b: b, i: i, u: u, s: s };
  }
  function reportForce() {
    var sel = window.getSelection();
    var anchor = sel && sel.anchorNode;
    var at = anchor ? (anchor.nodeType === 3 ? anchor.parentNode : anchor) : el;
    var af = ancestorsFormat(at);
    var s = {
      bold: cmdState('bold') || af.b,
      italic: cmdState('italic') || af.i,
      underline: cmdState('underline') || af.u,
      strike: cmdState('strikeThrough') || af.s,
      h2: blockTag() === 'h2',
      ul: cmdState('insertUnorderedList'),
      ol: cmdState('insertOrderedList'),
      quote: blockTag() === 'blockquote'
    };
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('STATE:' + JSON.stringify(s));
  }
  var stateTimer = null;
  function report() {
    if (stateTimer) return;
    stateTimer = setTimeout(function () { stateTimer = null; reportForce(); }, 90);
  }
  function push(){ if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('CHANGE:' + el.innerHTML); }
  function pushState(){ hist.push(el.innerHTML); if (hist.length > histCap) hist.shift(); }
  el.addEventListener('input', function () { pushState(); push(); });
  el.addEventListener('keyup', function () { pushState(); push(); report(); });
  el.addEventListener('blur', push);
  document.addEventListener('selectionchange', report);
  window.CM = function (cmd, value) { el.focus(); try { document.execCommand(cmd, false, value == null ? '' : value); } catch (e) {} el.focus(); pushState(); push(); reportForce(); setTimeout(reportForce, 60); };
  window.FORE = function (color) { el.focus(); try { document.execCommand('foreColor', false, color); } catch (e) {} el.focus(); pushState(); push(); reportForce(); };
  window.UNDO = function () { if (hist.length) { el.innerHTML = hist.pop(); push(); reportForce(); } };
  if (document.readyState === 'complete' || document.readyState === 'interactive') { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('READY'); reportForce(); }
  else window.addEventListener('load', function () { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('READY'); reportForce(); });
})();
</script>
</body></html>`;
}

const RichEditor = forwardRef(function RichEditor(
  { initialBody = '', onContentChange, onReady, onStateChange, style },
  ref
) {
  const webRef = useRef(null);
  const src = useRef(buildEditorHtml(initialBody)).current;

  useImperativeHandle(ref, () => ({
    run: (js) => {
      if (webRef.current) webRef.current.injectJavaScript(js);
    },
    setHtml: (html) => {
      if (webRef.current) {
        const v = String(html || '');
        webRef.current.injectJavaScript(
          `(function(){var el=document.getElementById('editable');el.innerHTML=${JSON.stringify(v)};hist.push(el.innerHTML);if(hist.length>histCap)hist.shift();push();reportForce();})();`
        );
      }
    },
    runCommand: (cmd, value) => {
      if (webRef.current) {
        webRef.current.injectJavaScript(`window.CM(${JSON.stringify(cmd)}, ${JSON.stringify(value == null ? null : value)});`);
      }
    },
    setColor: (color) => {
      if (webRef.current) {
        webRef.current.injectJavaScript(`window.FORE(${JSON.stringify(color)});`);
      }
    },
    undo: () => {
      if (webRef.current) webRef.current.injectJavaScript('window.UNDO();');
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
        if (data === 'READY') onReady && onReady();
        else if (data && data.startsWith('CHANGE:')) onContentChange && onContentChange(data.slice(7));
        else if (data && data.startsWith('STATE:')) {
          try {
            onStateChange && onStateChange(JSON.parse(data.slice(6)));
          } catch (err) {}
        }
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

export default RichEditor;