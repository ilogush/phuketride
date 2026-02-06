import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/ui/PageHeader";
import Card from "~/components/ui/Card";
import { MagnifyingGlassIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function ChatPage() {
    const { user } = useLoaderData<typeof loader>();

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
            <PageHeader title="Messages" />

            <Card className="flex-1 p-0 flex overflow-hidden border-gray-200">
                {/* Sidebar */}
                <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/30">
                    <div className="p-4 border-b border-gray-100">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search chats..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 transition-all"
                            />
                            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-4 text-center">
                            <p className="text-sm text-gray-500">No active chats</p>
                        </div>
                    </div>
                </div>

                {/* Main Chat */}
                <div className="flex-1 flex flex-col bg-white">
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <PaperAirplaneIcon className="w-8 h-8 text-gray-400 -rotate-12" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Select a chat</h3>
                            <p className="text-sm text-gray-500">Pick a conversation from the sidebar to start chatting</p>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-100">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                disabled
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none"
                            />
                            <button disabled className="p-2 bg-gray-800 text-white rounded-xl disabled:opacity-50">
                                <PaperAirplaneIcon className="w-5 h-5 -rotate-12" />
                            </button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
