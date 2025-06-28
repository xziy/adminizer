# System Models

Adminizer ships with several built‑in models used for authentication, media management and navigation. These definitions reside in `src/models` and can be automatically registered for **Waterline** and **Sequelize** ORMs by calling `registerSystemModels()` on the corresponding adapter.

The provided models are:

- `UserAP`
- `GroupAP`
- `MediaManagerAP`
- `MediaManagerAssociationsAP`
- `MediaManagerMetaAP`
- `NavigationAP`

They can be created and queried like any other models once registered.

