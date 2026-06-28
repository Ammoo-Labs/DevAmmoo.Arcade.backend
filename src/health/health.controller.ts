import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Liveness check for hosting platforms (Render, uptime monitors, etc.)' })
  check() {
    return { status: 'ok' };
  }
}
