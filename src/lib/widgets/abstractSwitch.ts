import BaseWidget from "./abstractWidgetBase";

export default abstract class SwitchBase extends BaseWidget {

  public readonly widgetType = "switcher"


    /** Widget background css color */
  public abstract readonly backgroundCSS: string | null;


  /** Get current state */
  public abstract getState(): Promise<boolean>

  /** Change the state, returns the one that turned out after the switch */
  public abstract switchIt(): Promise<boolean>
}
