import React from "react";
import { ShieldAlert } from "lucide-react";

const PermissionsPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
      <div className="bg-slate-50 p-6 rounded-full mb-6">
        <ShieldAlert size={48} className="text-slate-400" />
      </div>
      <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Access Restricted</h1>
      <p className="text-slate-500 font-medium max-w-sm mx-auto">
        System permissions are managed at the SuperAdmin level.
        As an Admin, you do not have permission to modify system roles or access rights.
      </p>

      <div className="mt-8 flex gap-4">
        <div className="px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">
          Role: ADMIN
        </div>
        <div className="px-4 py-2 bg-rose-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-500">
          Status: FORBIDDEN
        </div>
      </div>
    </div>
  );
};

export default PermissionsPage;
