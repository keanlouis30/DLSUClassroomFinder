'use client'

import { useState } from 'react'
import { ChevronRight, Home } from 'lucide-react'
import CampusView from './CampusView'
import BuildingView from './BuildingView'
import RoomDetail from './RoomDetail'
import { ViewLevel } from '@/types/heatmap'

export default function LayeredHeatMap() {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('campus')
  const [selectedBuilding, setSelectedBuilding] = useState<{ id: string; name: string } | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<{ id: string; name: string } | null>(null)

  const handleBuildingClick = (buildingId: string, buildingName: string) => {
    setSelectedBuilding({ id: buildingId, name: buildingName })
    setViewLevel('building')
  }

  const handleRoomClick = (roomId: string, roomName: string) => {
    setSelectedRoom({ id: roomId, name: roomName })
    setViewLevel('room')
  }

  const handleBackToCampus = () => {
    setSelectedBuilding(null)
    setSelectedRoom(null)
    setViewLevel('campus')
  }

  const handleBackToBuilding = () => {
    setSelectedRoom(null)
    setViewLevel('building')
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Breadcrumb Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={handleBackToCampus}
            className={`flex items-center gap-1 transition-colors ${
              viewLevel === 'campus'
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            <Home className="w-4 h-4" />
            Campus
          </button>

          {selectedBuilding && (
            <>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <button
                onClick={handleBackToBuilding}
                className={`transition-colors ${
                  viewLevel === 'building'
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                {selectedBuilding.name}
              </button>
            </>
          )}

          {selectedRoom && (
            <>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                {selectedRoom.name}
              </span>
            </>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {viewLevel === 'campus' && (
          <CampusView onBuildingClick={handleBuildingClick} />
        )}

        {viewLevel === 'building' && selectedBuilding && (
          <BuildingView
            buildingId={selectedBuilding.id}
            buildingName={selectedBuilding.name}
            onRoomClick={handleRoomClick}
          />
        )}

        {viewLevel === 'room' && selectedRoom && selectedBuilding && (
          <RoomDetail
            roomId={selectedRoom.id}
            roomName={selectedRoom.name}
            buildingId={selectedBuilding.id}
          />
        )}
      </div>
    </div>
  )
}

