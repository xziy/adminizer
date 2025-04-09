import { AbstractControls, ControlType } from "./AbstractControls";

export class ControlsHandler {
    // Storage: ControlType => (name => control)
    private controls = new Map<ControlType, Map<string, AbstractControls>>();


    // Add a control (type is automatically determined)
    public add(control: AbstractControls): void {
        const { type, name } = control;

        if (!this.controls.has(type)) {
            this.controls.set(type, new Map()); // Create a type group if it doesn't exist
        }

        const typeGroup = this.controls.get(type)!;
        if (typeGroup.has(name)) {
            throw new Error(`Control with name "${name}" already exists.`); // Control with this name already exists
        }

        typeGroup.set(name, control);
    }

    // Get control by type and name
    public  get<T extends ControlType>(
        type: T,
        name: string
    ): AbstractControls | undefined {
        return this.controls.get(type)?.get(name);
    }

    // Get all controls of specific type
    public  getByType<T extends ControlType>(
        type: T
    ): AbstractControls[] {
        const typeGroup = this.controls.get(type);
        return typeGroup ? Array.from(typeGroup.values()) : [];
    }

    // Remove control
    public  remove(type: ControlType, name: string): boolean {
        return this.controls.get(type)?.delete(name) ?? false;
    }

    // Get all controls (grouped by type)
    public  getAll(): Record<ControlType, AbstractControls[]> {
        return Object.fromEntries(
            Array.from(this.controls.entries()).map(([type, group]) => [
                type,
                Array.from(group.values())
            ])
        ) as Record<ControlType, AbstractControls[]>;
    }

}
