import { UserAP } from "models/UserAP";
import { AccessRightsToken } from "../interfaces/types";
import { Adminizer } from "../lib/Adminizer";
import { GroupAP } from "models/GroupAP";

export class AccessRightsHelper {

	private _tokens: AccessRightsToken[] = [];
	public adminizer: Adminizer;

	constructor(adminizer: Adminizer) {
		this.adminizer = adminizer;
	}

	public registerToken(accessRightsToken: AccessRightsToken): void {
		if (!accessRightsToken.id || !accessRightsToken.name || !accessRightsToken.description || !accessRightsToken.department) {
			throw new Error("Adminpanel > Can not register token: Missed one or more required parameters");
		}

		for (let token of this._tokens) {
			if (token.id === accessRightsToken.id) {
				throw new Error("Adminpanel > Can not register token: Token with this id already registered");
			}
		}
		this._tokens.push(accessRightsToken);
	}

	public registerTokens(accessRightsTokens: AccessRightsToken[]): void {
		for (let token of accessRightsTokens) {
			this.registerToken(token);
		}
	}

	public getTokens(): AccessRightsToken[] {
		return this._tokens;
	}

	public getTokensByDepartment(department: string): AccessRightsToken[] {
		return this._tokens.filter((token) => token.department === department);
	}

	public getAllDepartments(): string[] {
		return this._tokens
			.map((token) => token.department)
			.filter((item, pos, self) => self.indexOf(item) === pos);
	}

	public enoughPermissions(tokens: string[], user: UserAP): boolean {
		if (user.isAdministrator) {
			return true;
		}

		if (!tokens.length) {
			return false;
		}

		return tokens.some((token) => this.hasPermission(token, user));
	}

	public hasPermission(tokenId: string, user: UserAP): boolean {
		if (!this.adminizer.config.auth.enable) {
			return true;
		}

		if (user.isAdministrator) {
			return true;
		}

		const tokenIsValid = this._tokens.some((token) => token.id === tokenId);

		if (!tokenIsValid) {
			Adminizer.log.error("Adminpanel > Token is not valid", tokenId, user.login);
			return false;
		}

		return user.groups.some((group: GroupAP) => group.tokens?.includes(tokenId));
	}
}
