"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportCategory = void 0;
var Reportstatus;
(function (Reportstatus) {
    Reportstatus["PENDENTE"] = "pendente";
    Reportstatus["APROVADO"] = "aprovado";
    Reportstatus["REJEITADO"] = "rejeitado";
})(Reportstatus || (Reportstatus = {}));
;
var Role;
(function (Role) {
    Role[Role["Owner"] = 1] = "Owner";
    Role[Role["Admin"] = 2] = "Admin";
    Role[Role["Moderador"] = 3] = "Moderador";
    Role[Role["Suporte"] = 4] = "Suporte";
    Role[Role["UserComum"] = 5] = "UserComum";
    Role[Role["Banned"] = 6] = "Banned";
    Role[Role["Prefeito"] = 7] = "Prefeito";
    Role[Role["Vereador"] = 8] = "Vereador";
    Role[Role["Presidente"] = 9] = "Presidente";
})(Role || (Role = {}));
;
var ReportCategory;
(function (ReportCategory) {
    ReportCategory[ReportCategory["Deslizamentos"] = 1] = "Deslizamentos";
    ReportCategory[ReportCategory["Alagamentos"] = 2] = "Alagamentos";
    ReportCategory[ReportCategory["Assalto"] = 3] = "Assalto";
    ReportCategory[ReportCategory["Inc\u00EAndio"] = 4] = "Inc\u00EAndio";
    ReportCategory[ReportCategory["Iluminacao"] = 5] = "Iluminacao";
    ReportCategory[ReportCategory["Buracos"] = 6] = "Buracos";
    ReportCategory[ReportCategory["Desabamentos"] = 7] = "Desabamentos";
    ReportCategory[ReportCategory["Outros"] = 8] = "Outros";
})(ReportCategory || (exports.ReportCategory = ReportCategory = {}));
