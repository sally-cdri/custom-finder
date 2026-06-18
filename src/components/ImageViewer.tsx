import { useEffect, useState } from "react";
import type { ImageNode } from "../core/types";
import { assetSrc } from "../app/import";

interface Props {
  node: ImageNode;
  onClose: () => void;
}

export function ImageViewer({ node, onClose }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    assetSrc(node.storedName).then((s) => alive && setSrc(s));
    return () => {
      alive = false;
    };
  }, [node.storedName]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="overlay overlay--dark" onMouseDown={onClose}>
      <figure className="viewer" onMouseDown={(e) => e.stopPropagation()}>
        {src && <img src={src} alt={node.name} className="viewer__img" />}
        <figcaption className="viewer__caption">{node.name}</figcaption>
      </figure>
    </div>
  );
}
