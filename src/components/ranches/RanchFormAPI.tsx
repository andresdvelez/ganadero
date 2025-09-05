"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { db, generateUUID, addToSyncQueue } from "@/lib/dexie";
import { RanchFormLogic, RanchFormData } from "./RanchFormLogic";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

interface RanchFormAPIProps {
  ranchId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RanchFormAPI({
  ranchId,
  onSuccess,
  onCancel,
}: RanchFormAPIProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user } = useUser();
  
  const createRanchMutation = trpc.farm.create.useMutation();
  const updateRanchMutation = trpc.farm.update.useMutation();
  const getRanchQuery = trpc.farm.getById.useQuery(
    { id: ranchId! },
    { enabled: !!ranchId }
  );
  
  const orgsQuery = trpc.org.myOrganizations.useQuery();
  const currentOrg = orgsQuery.data?.[0];

  const handleSubmit = async (data: RanchFormData) => {
    setIsLoading(true);
    
    if (!currentOrg?.id) {
      throw new Error("No organization selected");
    }
    
    try {
      const farmData = {
        orgId: currentOrg.id,
        code: data.ranchCode,
        name: data.farmName,
        location: data.location,
        officialNumber: data.officialNumber,
        ownerName: data.owner,
        phone: data.phone,
        ranchPhone: data.ranchPhone,
        address: data.address,
        nit: data.nit,
        directions: data.directions,
        breederName: data.breederName,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        lastDataEntryAt: data.lastDataEntry ? new Date(data.lastDataEntry) : undefined,
        lastVisitAt: data.lastVisitDate ? new Date(data.lastVisitDate) : undefined,
        maleCount: data.males || 0,
        femaleCount: data.females || 0,
        uggAsOf: data.uggDate ? new Date(data.uggDate) : undefined,
      };

      if (ranchId) {
        await updateRanchMutation.mutateAsync({
          id: ranchId,
          ...farmData,
        });
      } else {
        await createRanchMutation.mutateAsync(farmData);
      }

      try {
        const localData = {
          uuid: ranchId || generateUUID(),
          userId: user?.id || "",
          ...farmData,
          synced: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        if (ranchId) {
          await db.farms?.put(localData);
        } else {
          await db.farms?.add(localData);
        }
        
        await addToSyncQueue(
          ranchId ? "update" : "create",
          "farms",
          localData.uuid,
          JSON.stringify(localData),
          user?.id || ""
        );
      } catch (offlineError) {
        console.log("Offline storage failed, but API succeeded:", offlineError);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/ranches");
      }
    } catch (error) {
      console.error("Error saving ranch:", error);
      
      try {
        const localFailData = {
          uuid: ranchId || generateUUID(),
          userId: user?.id || "",
          orgId: currentOrg.id,
          code: data.ranchCode,
          name: data.farmName,
          location: data.location,
          officialNumber: data.officialNumber,
          ownerName: data.owner,
          phone: data.phone,
          ranchPhone: data.ranchPhone,
          address: data.address,
          nit: data.nit,
          directions: data.directions,
          breederName: data.breederName,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          lastDataEntryAt: data.lastDataEntry ? new Date(data.lastDataEntry) : undefined,
          lastVisitAt: data.lastVisitDate ? new Date(data.lastVisitDate) : undefined,
          maleCount: data.males || 0,
          femaleCount: data.females || 0,
          uggAsOf: data.uggDate ? new Date(data.uggDate) : undefined,
          synced: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        if (ranchId) {
          await db.farms?.put(localFailData);
        } else {
          await db.farms?.add(localFailData);
        }
        
        await addToSyncQueue(
          ranchId ? "update" : "create",
          "farms",
          localFailData.uuid,
          JSON.stringify(localFailData),
          user?.id || ""
        );

        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/ranches");
        }
      } catch (offlineError) {
        console.error("Both API and offline storage failed:", offlineError);
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const initialData = getRanchQuery.data ? {
    ranchCode: getRanchQuery.data.code,
    farmName: getRanchQuery.data.name,
    location: getRanchQuery.data.location || "",
    officialNumber: getRanchQuery.data.officialNumber || "",
    owner: getRanchQuery.data.ownerName || "",
    phone: getRanchQuery.data.phone || "",
    ranchPhone: getRanchQuery.data.ranchPhone || "",
    address: getRanchQuery.data.address || "",
    nit: getRanchQuery.data.nit || "",
    directions: getRanchQuery.data.directions || "",
    breederCode: "",
    breederName: getRanchQuery.data.breederName || "",
    startDate: getRanchQuery.data.startDate?.toISOString().split("T")[0] || "",
    lastDataEntry: getRanchQuery.data.lastDataEntryAt?.toISOString().split("T")[0] || "",
    updatedTo: "",
    lastVisitDate: getRanchQuery.data.lastVisitAt?.toISOString().split("T")[0] || "",
    males: getRanchQuery.data.maleCount,
    females: getRanchQuery.data.femaleCount,
    uggLots: 0,
    uggDate: getRanchQuery.data.uggAsOf?.toISOString().split("T")[0] || "",
    totalUGG: getRanchQuery.data.uggValue || 0,
    historicalCostAccumulation: false,
  } : undefined;

  return (
    <RanchFormLogic
      initialData={initialData}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      isLoading={isLoading || getRanchQuery.isLoading}
    />
  );
}