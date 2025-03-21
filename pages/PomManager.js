import CommonActions from "../utils/commonActions";
import AdminPage from "./AdminPage";
import LoginPage from "./LoginPage";
import PIMPage from "./PIMPage";

export default class PomManager {
  constructor(page) {
    this.page = page;
    this.loginPage = new LoginPage(page);
    this.adminPage = new AdminPage(page);
    this.pimPage = new PIMPage(page);
    this.commonActions = new CommonActions(page);
  }
}
