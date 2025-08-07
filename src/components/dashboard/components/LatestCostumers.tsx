// src/components/dashboard/components/LatestCostumers.tsx
import Image from "next/image";
import React from "react";

const LatestCostumers = () => {
  return (
    <div className="mb-4 h-full rounded-lg bg-white p-4 shadow sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-bold leading-none text-gray-900">
          Últimos Registros
        </h3>
        <a
          href="#"
          className="inline-flex items-center rounded-lg p-2 text-sm font-medium text-cyan-600 hover:bg-gray-100"
        >
          Ver Todos
        </a>
      </div>
      <div className="flow-root">
        <ul role="list" className="divide-y divide-gray-200">
          <li className="py-3 sm:py-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Image
                  className="h-8 w-8 rounded-full"
                  src="https://demo.themesberg.com/windster/images/users/neil-sims.png"
                  alt="Neil image"
                  width={100}
                  height={100}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  Neil Sims
                </p>
                <p className="truncate text-sm text-gray-500">
                  <a
                    href="/cdn-cgi/l/email-protection"
                    className="__cf_email__"
                    data-cfemail="17727a767e7b57607e7973646372653974787a"
                  >
                    neil@gmail.com
                  </a>
                </p>
              </div>
              <div className="inline-flex items-center text-base font-semibold text-gray-900">
                $320000
              </div>
            </div>
          </li>
          <li className="py-3 sm:py-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Image
                  className="h-8 w-8 rounded-full"
                  src="https://demo.themesberg.com/windster/images/users/bonnie-green.png"
                  alt="Neil image"
                  width={100}
                  height={100}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  Bonnie Green
                </p>
                <p className="truncate text-sm text-gray-500">
                  <a
                    href="/cdn-cgi/l/email-protection"
                    className="__cf_email__"
                    data-cfemail="d4b1b9b5bdb894a3bdbab0a7a0b1a6fab7bbb9"
                  >
                    bonnie@gmail.com
                  </a>
                </p>
              </div>
              <div className="inline-flex items-center text-base font-semibold text-gray-900">
                $34670
              </div>
            </div>
          </li>
          <li className="py-3 sm:py-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Image
                  className="h-8 w-8 rounded-full"
                  src="https://demo.themesberg.com/windster/images/users/michael-gough.png"
                  alt="Neil image"
                  width={100}
                  height={100}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  Michael Gough
                </p>
                <p className="truncate text-sm text-gray-500">
                  <a
                    href="/cdn-cgi/l/email-protection"
                    className="__cf_email__"
                    data-cfemail="57323a363e3b17203e3933242332257934383a"
                  >
                    michael@gmail.com
                  </a>
                </p>
              </div>
              <div className="inline-flex items-center text-base font-semibold text-gray-900">
                $67000
              </div>
            </div>
          </li>
          <li className="py-3 sm:py-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Image
                  className="h-8 w-8 rounded-full"
                  src="https://demo.themesberg.com/windster/images/users/thomas-lean.png"
                  alt="Neil image"
                  width={100}
                  height={100}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  Thomes Lean
                </p>
                <p className="truncate text-sm text-gray-500">
                  <a
                    href="/cdn-cgi/l/email-protection"
                    className="__cf_email__"
                    data-cfemail="284d45494144685f41464c5b5c4d5a064b4745"
                  >
                    thomes@gmail.com
                  </a>
                </p>
              </div>
              <div className="inline-flex items-center text-base font-semibold text-gray-900">
                $23670
              </div>
            </div>
          </li>
          <li className="pt-3 pb-0 sm:pt-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Image
                  className="h-8 w-8 rounded-full"
                  src="https://demo.themesberg.com/windster/images/users/lana-byrd.png"
                  alt="Neil image"
                  width={100}
                  height={100}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  Lana Byrd
                </p>
                <p className="truncate text-sm text-gray-500">
                  <a
                    href="/cdn-cgi/l/email-protection"
                    className="__cf_email__"
                    data-cfemail="a2c7cfc3cbcee2d5cbccc6d1d6c7d08cc1cdcf"
                  >
                    lana@gmail.com
                  </a>
                </p>
              </div>
              <div className="inline-flex items-center text-base font-semibold text-gray-900">
                $367000
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default LatestCostumers;
