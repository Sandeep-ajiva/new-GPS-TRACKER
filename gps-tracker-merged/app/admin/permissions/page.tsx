import React, { useEffect, useMemo, useState } from "react";
import Validator from "../Helpers/validators";

const defaultActions = ["create", "read", "update", "delete"];

const demoPermissions: PermissionRecord[] = [
  {
    id: "perm_admin",
    role: "admin",
    hierarchy: 3,
    modules: {
      organizations: ["create", "read", "update"],
      users: ["create", "read", "update"],
      vehicle: ["create", "read", "update", "delete"],
      gpsDevice: ["create", "read", "update", "delete"],
      deviceMapping: ["create", "read", "update"],
      gpsLiveData: ["read"],
      gpsHistory: ["read"],
    },
  },
  {
    id: "perm_manager",
    role: "manager",
    hierarchy: 2,
    modules: {
      organizations: [],
      users: ["read"],
      vehicle: ["create", "read", "update"],
      gpsDevice: ["read"],
      deviceMapping: ["read"],
      gpsLiveData: ["read"],
      gpsHistory: ["read"],
    },
  },
  {
    id: "perm_driver",
    role: "driver",
    hierarchy: 1,
    modules: {
      organizations: [],
      users: [],
      vehicle: ["read"],
      gpsDevice: [],
      deviceMapping: [],
      gpsLiveData: ["read"],
      gpsHistory: ["read"],
    },
  },
];

type PermissionRecord = {
  id?: string;
  _id?: string;
  role: string;
  hierarchy?: number;
  modules?: Record<string, string[]>;
  business_type?: string;
};

const getRecordId = (record: PermissionRecord) =>
  record.id || record._id || "";

const buildModulesForRole = (
  roleModules: Record<string, string[]> | undefined,
  allModules: string[]
) => {
  const moduleNames =
    allModules.length > 0 ? allModules : Object.keys(roleModules || {});
  const result: Record<string, string[]> = {};

  moduleNames.forEach((moduleName) => {
    const actions = roleModules?.[moduleName];
    result[moduleName] = Array.isArray(actions) ? [...actions] : [];
  });

  return result;
};

const PermissionsForm = () => {
  const [permissionRecords, setPermissionRecords] =
    useState<PermissionRecord[]>(demoPermissions.filter(p => p.role !== "superadmin"));
  const [permissions, setPermissions] = useState<
    Record<string, { hierarchy?: number; modules: Record<string, string[]> }>
  >({});
  const [formData, setFormData] = useState({ roleId: "", hierarchy: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const Rules = {
    roleId: { required: true, errorMessage: "Please select a role." },
    hierarchy: { required: true, type: "number" as const, errorMessage: "Please set hierarchy." }
  };

  const validator = new Validator(Rules);

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const validationErrors = await validator.validateFormField(name, value);
    setErrors((prev) => ({
      ...prev,
      [name]: validationErrors[name] || ""
    }));
  };
  const [loading] = useState(false);
  const [loadError] = useState("");

  const moduleList = useMemo(() => {
    const modules = new Set<string>();
    permissionRecords.forEach((record) => {
      Object.keys(record.modules || {}).forEach((moduleName) =>
        modules.add(moduleName)
      );
    });
    return Array.from(modules);
  }, [permissionRecords]);

  useEffect(() => {
    if (permissionRecords.length > 0) {
      const first = permissionRecords[0];
      setFormData({
        roleId: getRecordId(first),
        hierarchy:
          typeof first.hierarchy === "number" ? `${first.hierarchy}` : "",
      });
    }
  }, [permissionRecords]);

  useEffect(() => {
    if (!formData.roleId) {
      setPermissions({});
      return;
    }

    const record = permissionRecords.find(
      (item) => getRecordId(item) === formData.roleId
    );
    if (!record) {
      return;
    }

    const roleModules = buildModulesForRole(record.modules, moduleList);
    setPermissions({
      [record.role]: {
        hierarchy: record.hierarchy,
        modules: roleModules,
      },
    });
  }, [formData.roleId, permissionRecords, moduleList]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  const togglePermission = (role: string, module: string, action: string) => {
    setPermissions((prev) => {
      const updated = { ...prev };
      const perms = updated[role].modules[module];
      if (perms.includes(action)) {
        updated[role].modules[module] = perms.filter((p) => p !== action);
      } else {
        updated[role].modules[module] = [...perms, action];
      }
      return updated;
    });
  };

  const toggleAllModulePermissions = (role: string, moduleName: string) => {
    setPermissions((prev) => {
      const currentActions = prev[role].modules[moduleName];
      const allActions = ["create", "read", "update", "delete"];
      const updatedModules = {
        ...prev[role].modules,
        [moduleName]:
          currentActions.length === allActions.length ? [] : allActions,
      };

      return {
        ...prev,
        [role]: {
          ...prev[role],
          modules: updatedModules,
        },
      };
    });
  };

  const toggleAllPermissions = (role: string, action: string) => {
    setPermissions((prev) => {
      const updatedModules = { ...prev[role].modules };
      const allChecked = Object.values(updatedModules).every((actions) =>
        actions.includes(action)
      );

      Object.keys(updatedModules).forEach((module) => {
        const hasAction = updatedModules[module].includes(action);
        if (allChecked && hasAction) {
          updatedModules[module] = updatedModules[module].filter(
            (a) => a !== action
          );
        } else if (!allChecked && !hasAction) {
          updatedModules[module].push(action);
        }
      });

      return {
        ...prev,
        [role]: {
          ...prev[role],
          modules: updatedModules,
        },
      };
    });
  };
  const getFilteredPermissions = () => {
    const cleaned: Record<
      string,
      { hierarchy?: number; modules: Record<string, string[]> }
    > = {};

    for (const role in permissions) {
      const modules = permissions[role].modules;
      const filteredModules: Record<string, string[]> = {};

      for (const moduleName in modules) {
        const actions = modules[moduleName];
        if (actions.length > 0) {
          filteredModules[moduleName] = actions;
        }
      }

      // Only add role if it has at least one module with actions
      if (Object.keys(filteredModules).length > 0) {
        cleaned[role] = {
          ...permissions[role],
          modules: filteredModules,
        };
      }
    }

    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = await validator.validate(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const roleName = permissionRecords.find(r => getRecordId(r) === formData.roleId)?.role || "";
    if (!roleName) return;
    const updatedPermissions = getFilteredPermissions();
    const modules = updatedPermissions[roleName]?.modules || {};
    setPermissionRecords((prev) =>
      prev.map((record) =>
        getRecordId(record) === formData.roleId
          ? {
            ...record,
            hierarchy: Number(formData.hierarchy),
            modules,
          }
          : record
      )
    );
    alert("Permissions updated successfully (demo)");
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-600">
          Loading permissions...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-600 shadow-sm">
        {loadError}
      </div>
    );
  }

  const activeRoleName = Object.keys(permissions)[0];
  const activeModules = activeRoleName
    ? permissions[activeRoleName]?.modules || {}
    : {};

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Access Control</p>
        <h2 className="text-2xl font-black text-slate-900">Permissions</h2>
        <p className="text-sm text-slate-500">Set module access by role hierarchy.</p>

        <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_0.6fr]">
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">Role</label>
            <select
              name="roleId"
              value={formData.roleId}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="" disabled></option>
              {permissionRecords.map((record) => (
                <option key={getRecordId(record)} value={getRecordId(record)}>
                  {record.role}
                </option>
              ))}
            </select>
            {errors.roleId && (
              <p className="mt-1 text-xs font-semibold text-rose-600">{errors.roleId}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">Hierarchy</label>
            <input
              type="number"
              name="hierarchy"
              value={formData.hierarchy}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
              min="0"
            />
            {errors.hierarchy && (
              <p className="mt-1 text-xs font-semibold text-rose-600">{errors.hierarchy}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="overflow-x-auto">
          {Object.entries(permissions).map(([role, { modules }]) => (
            <div key={role} className="mb-6 last:mb-0">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-600">Permissions</h3>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {role}
                </span>
              </div>
              <table className="min-w-full table-auto border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <th className="border-b border-slate-200 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          onChange={() => {
                            const updatedModules: Record<string, string[]> = {};
                            const isAllChecked = Object.values(modules).every(
                              (actions) =>
                                actions.includes("create") &&
                                actions.includes("read") &&
                                actions.includes("update") &&
                                actions.includes("delete")
                            );

                            Object.keys(modules).forEach((moduleName) => {
                              updatedModules[moduleName] = isAllChecked
                                ? []
                                : defaultActions;
                            });

                            setPermissions({
                              ...permissions,
                              [role]: {
                                ...permissions[role],
                                modules: updatedModules,
                              },
                            });
                          }}
                          checked={Object.values(modules).every(
                            (actions) =>
                              actions.includes("create") &&
                              actions.includes("read") &&
                              actions.includes("update") &&
                              actions.includes("delete")
                          )}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                        />
                        Module
                      </div>
                    </th>
                    {["create", "read", "update", "delete"].map((action) => (
                      <th
                        key={action}
                        className="border-b border-slate-200 px-4 py-3 text-center"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="checkbox"
                            onChange={() => toggleAllPermissions(role, action)}
                            checked={Object.values(modules).every((a) =>
                              a.includes(action)
                            )}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                          />
                          {action}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(modules).map(([moduleName, actions]) => (
                    <tr key={moduleName} className="text-sm text-slate-700">
                      <td className="border-b border-slate-100 px-4 py-3 font-semibold capitalize">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            onChange={() =>
                              toggleAllModulePermissions(role, moduleName)
                            }
                            checked={["create", "read", "update", "delete"].every(
                              (action) => actions.includes(action)
                            )}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                          />
                          {moduleName}
                        </div>
                      </td>
                      {["create", "read", "update", "delete"].map((action) => (
                        <td
                          key={action}
                          className="border-b border-slate-100 px-4 py-3 text-center"
                        >
                          <input
                            type="checkbox"
                            checked={actions.includes(action)}
                            onChange={() =>
                              togglePermission(role, moduleName, action)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:opacity-50"
        disabled={!activeRoleName || Object.keys(activeModules).length === 0}
      >
        Update Permissions
      </button>
    </form>
  );
};

export default PermissionsForm;
