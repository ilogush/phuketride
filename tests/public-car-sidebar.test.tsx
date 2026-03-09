import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import CarTripSidebar from "../app/components/public/car/CarTripSidebar";

test("CarTripSidebar renders primary and secondary actions with expected styling", () => {
    const router = createMemoryRouter([
        {
            path: "/",
            element: (
                <CarTripSidebar
                    carId={1}
                    carPathSegment="monkey-car-toyota-veloz-8093"
                    pickupDistrict="Patong"
                    returnDistricts={[
                        { id: 1, name: "Patong", isActive: true, deliveryPrice: 0 },
                        { id: 2, name: "Karon", isActive: true, deliveryPrice: 300 },
                    ]}
                    initialReturnDistrictId={1}
                    pricePerDay={1200}
                    hostPhone="+660000000"
                    hostEmail="host@example.com"
                    hostTelegram="@host"
                    deliveryFeeAfterHours={0}
                    weeklySchedule={null}
                    holidays={null}
                />
            ),
        },
    ]);

    const html = renderToStaticMarkup(
        <RouterProvider router={router} />
    );

    assert.ok(html.includes("/cars/monkey-car-toyota-veloz-8093/checkout?"), "checkout link should be present");
    assert.ok(
        html.includes('class="w-full inline-flex items-center justify-center rounded-xl bg-green-600 text-white px-5 py-3 text-base font-medium hover:bg-green-700 gap-2"'),
        "continue CTA should keep public primary styling"
    );
    assert.match(
        html,
        /<button[^>]*class="[^"]*border-green-600[^"]*bg-white[^"]*text-green-600[^"]*"[^>]*>/
    );
    assert.ok(
        html.includes('href="https://t.me/host"'),
        "chat link should prefer telegram"
    );
    assert.ok(
        html.includes('class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-green-600 bg-white px-5 py-3 text-base font-medium text-green-600 transition-all duration-200 hover:bg-green-50 hover:text-green-700"'),
        "chat action should keep public secondary styling"
    );
    assert.ok(!html.includes("bg-gray-200"), "shared gray button styling should not leak into public sidebar");
});
