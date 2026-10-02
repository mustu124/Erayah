"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Carousel } from "@/components/ui/Carousel";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { QuantityStepper } from "@/components/ui/QuantityStepper";

export function InteractiveDemos() {
  const [quantity, setQuantity] = useState(1);
  const [drawer, setDrawer] = useState<"left" | "right" | null>(null);

  return (
    <>
      <section>
        <h2 className="mb-6 border-b border-mist pb-2 font-body text-label font-medium text-ink/60 uppercase">Quantity, icon button</h2>
        <div className="flex flex-wrap items-center gap-3">
          <QuantityStepper value={quantity} onChange={setQuantity} />
          <Button className="flex-1 sm:flex-none">Add to cart</Button>
          <IconButton label="Save to wishlist" className="border border-mist">
            <Icon icon={Heart} />
          </IconButton>
        </div>
      </section>

      <section>
        <h2 className="mb-6 border-b border-mist pb-2 font-body text-label font-medium text-ink/60 uppercase">Drawer</h2>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => setDrawer("left")}>
            Open left
          </Button>
          <Button variant="outline" onClick={() => setDrawer("right")}>
            Open right
          </Button>
        </div>
        <Drawer open={drawer !== null} onClose={() => setDrawer(null)} side={drawer ?? "right"} title="Drawer">
          <div className="space-y-4 p-6 text-body">
            <p>Focus stays inside. Esc or a tap on the backdrop closes it.</p>
            <Button onClick={() => setDrawer(null)}>Close</Button>
          </div>
        </Drawer>
      </section>

      <section>
        <h2 className="mb-6 border-b border-mist pb-2 font-body text-label font-medium text-ink/60 uppercase">Carousel</h2>
        <Carousel label="Demo">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i}>
              <div className="flex aspect-[4/5] items-center justify-center bg-ivory font-heading text-h2 text-ink/40">
                {i + 1}
              </div>
              <p className="mt-3 text-body-sm">Piece {i + 1}</p>
            </div>
          ))}
        </Carousel>
      </section>
    </>
  );
}
