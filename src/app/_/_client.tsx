"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { translations } from "@/lib/constants/translations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { db } from "@/lib/dexie";
import Link from "next/link";
import { Plus, Search, Filter, Home as Cow } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function AnimalsClient() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [localAnimals, setLocalAnimals] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const params = useSearchParams();

  const { data: serverAnimals, isLoading } = trpc.animal.getAll.useQuery(
    undefined,
    {
      enabled: isOnline,
      retry: false,
    }
  );

  useEffect(() => {
    (async () => {
      try {
        const animals = await db.animals.toArray();
        setLocalAnimals(animals);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    const qp = params.get("q");
    if (qp != null) setSearchTerm(qp);
  }, [params]);

  const allAnimals = isOnline && serverAnimals ? serverAnimals : localAnimals;
  const filteredAnimals = allAnimals.filter((animal) => {
    const matchesSearch =
      animal.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.tagNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || animal.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-ranch-900">
              {translations.animals.title}
            </h1>
            <p className="text-ranch-600 mt-1">
              {translations.animals.totalAnimals}: {filteredAnimals.length}
            </p>
          </div>
          <Link href="/animals/new">
            <Button className="bg-ranch-500 hover:bg-ranch-600 text-white">
              <Plus className="h-5 w-5 mr-2" />
              {translations.animals.addAnimal}
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-ranch-400" />
                  <input
                    type="text"
                    placeholder={`${translations.common.search}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-ranch-600" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="Filtrar por estado"
                  className="px-4 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                >
                  <option value="all">{translations.common.all}</option>
                  <option value="active">{translations.animals.active}</option>
                  <option value="sold">{translations.animals.sold}</option>
                  <option value="deceased">
                    {translations.animals.deceased}
                  </option>
                  <option value="pregnant">
                    {translations.animals.pregnant}
                  </option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-ranch-600">{translations.common.loading}</p>
          </div>
        ) : filteredAnimals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Cow className="h-12 w-12 text-ranch-400 mx-auto mb-4" />
              <p className="text-ranch-600">{translations.common.noData}</p>
              <Link href="/animals/new">
                <Button className="mt-4 bg-ranch-500 hover:bg-ranch-600 text-white">
                  <Plus className="h-5 w-5 mr-2" />
                  {translations.animals.addAnimal}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAnimals.map((animal: any) => (
              <Card key={animal.uuid}>
                <CardHeader>
                  <CardTitle>{animal.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-ranch-600">{animal.tagNumber}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
