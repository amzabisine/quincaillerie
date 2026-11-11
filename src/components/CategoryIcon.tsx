import { BrickWall, Droplets, Hammer, Layers, Package, PaintBucket, TreePine, Wrench, Zap, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  "brick-wall": BrickWall, layers: Layers, "paint-bucket": PaintBucket, droplets: Droplets,
  zap: Zap, hammer: Hammer, wrench: Wrench, "tree-pine": TreePine, package: Package,
};

export function CategoryIcon({ name, size = 22 }: { name: string; size?: number }) {
  const Icon = icons[name] ?? Package;
  return <Icon size={size} aria-hidden />;
}
