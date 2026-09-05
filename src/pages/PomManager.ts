import { Page } from "@playwright/test";
import CommonActions from "../../utils/commonActions";
import AdminPage from "./AdminPage";
import LoginPage from "./LoginPage";
import PIMPage from "./PIMPage";
import EmployeePersonalDetailsPage from "./EmployeePersonalDetailsPage";

export default class PomManager {
  readonly page: Page;
  readonly loginPage: LoginPage;
  readonly adminPage: AdminPage;
  readonly pimPage: PIMPage;
  readonly employeePersonalDetailsPage: EmployeePersonalDetailsPage;
  readonly commonActions: CommonActions;

  constructor(page: Page) {
    this.page = page;
    this.loginPage = new LoginPage(page);
    this.adminPage = new AdminPage(page);
    this.pimPage = new PIMPage(page);
    this.employeePersonalDetailsPage = new EmployeePersonalDetailsPage(page);
    this.commonActions = new CommonActions(page);
  }
}
