"use client";

import { useEffect, useState, useRef } from "react";
import asyncApiCss from "./vendor/asyncapi-react-css";

export default function AsyncApiViewer({ schema }: { schema: string }) {
  const [Component, setComponent] = useState<any>(null);
  const cssInjected = useRef(false);

  useEffect(() => {
    if (!cssInjected.current) {
      cssInjected.current = true;
      const id = "asyncapi-react-styles";
      if (!document.getElementById(id)) {
        const style = document.createElement("style");
        style.id = id;
        style.textContent = asyncApiCss;
        document.head.appendChild(style);
      }
    }

    import("./vendor/asyncapi-react.js").then((mod) => {
      setComponent(() => mod.default);
    });
  }, []);

  if (!Component)
    return <div style={{ padding: "1rem" }}>Loading schema…</div>;

  return <Component schema={schema} />;
}
