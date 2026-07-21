// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import StreamingMessageDisplay from './StreamingMessageDisplay'
import ProtoViewer from './ProtoViewer'
import { useMethodExplorerContext } from '../stores'

const ReceivedStreamingPanel: React.FC = () => {
  const { selectedTarget, selectedService, selectedMethod, response, stream } = useMethodExplorerContext()

  return (
    <StreamingMessageDisplay
      label="Received Messages"
      messages={stream.messages}
      schema={response.schema}
      colorScheme="purple"
      active={stream.active}
      raw={response.raw || undefined}
      serviceName={selectedService?.name}
      methodName={selectedMethod?.name}
      time={response.time}
      size={response.size}
      schemaNode={<ProtoViewer selectedTarget={selectedTarget} selectedService={selectedService} selectedMethod={selectedMethod} inline outputOnly />}
    />
  )
}

export default ReceivedStreamingPanel
