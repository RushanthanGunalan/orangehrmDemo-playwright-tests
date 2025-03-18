import AdminPage from "./AdminPage";
import LoginPage from "./LoginPage";

export default class PomManager {
  constructor(page) {
    this.page = page;
    this.loginPage = new LoginPage(page);
    this.adminPage = new AdminPage(page);
  }
}
