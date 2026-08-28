import "./index.css";
import { Composition } from "remotion";
import { LyricVideo } from "./LyricVideo";
import { CUT_END, CUT_START } from "./data/lyrics";

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Samaritano"
      component={LyricVideo}
      durationInFrames={Math.round((CUT_END - CUT_START) * FPS)}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
