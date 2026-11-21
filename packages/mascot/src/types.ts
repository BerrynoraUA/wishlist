/** Everything is in the art's own 640-unit canvas. */
export type MascotLayer = {
  id: string;
  /** The joint this layer turns and scales around. */
  pivot: readonly number[];
  /** Where the sprite sits on the canvas: x, y, width, height. Groups have no sprite. */
  box?: readonly number[];
  /** Where the sprite sits in the atlas: x, y. */
  atlas?: readonly number[];
  children?: readonly MascotLayer[];
};

export type MascotPoseLayout = {
  atlas: readonly number[];
  /** Scale, x, y: puts this pose's padlock at the same size and place as every other pose's. */
  fit: readonly number[];
  layers: readonly MascotLayer[];
};
