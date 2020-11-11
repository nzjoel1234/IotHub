import * as React from 'react';

export function getBrowserVisibilityProp() {
  if (typeof document.hidden !== "undefined") {
    // Opera 12.10 and Firefox 18 and later support
    return "visibilitychange"
  } else if (typeof (document as any).msHidden !== "undefined") {
    return "msvisibilitychange"
  } else if (typeof (document as any).webkitHidden !== "undefined") {
    return "webkitvisibilitychange"
  }
}
export function getBrowserDocumentHiddenProp() {
  if (typeof document.hidden !== "undefined") {
    return "hidden"
  } else if (typeof (document as any).msHidden !== "undefined") {
    return "msHidden"
  } else if (typeof (document as any).webkitHidden !== "undefined") {
    return "webkitHidden"
  }
}

export function getIsDocumentHidden() {
  const prop = getBrowserDocumentHiddenProp();
  return !!prop && !(document as any)[prop];
}

export function usePageVisibility() {
  const [isVisible, setIsVisible] = React.useState(getIsDocumentHidden())
  const onVisibilityChange = () => setIsVisible(getIsDocumentHidden())
  React.useEffect(() => {
    const visibilityChange = getBrowserVisibilityProp();
    if (!visibilityChange) {
      return;
    }
    document.addEventListener(visibilityChange, onVisibilityChange, false)
    return () => {
      document.removeEventListener(visibilityChange, onVisibilityChange)
    }
  })
  return isVisible
}

export default usePageVisibility;