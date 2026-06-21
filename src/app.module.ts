

// import { Module } from '@nestjs/common';
// import { PrismaModule } from './prisma/prisma.module';
// import { BotModule } from './bot/bot.module';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { TelegrafModule } from 'nestjs-telegraf';

// @Module({
//   imports: [
//     ConfigModule.forRoot(),
//     TelegrafModule.forRootAsync({
//       imports: [ConfigModule],
//       inject: [ConfigService],
//       useFactory: (config: ConfigService) => ({
//         token: config.getOrThrow<string>('BOT_TOKEN'),
//         options: {
//           telegram: {
//             apiRoot: 'http://localhost:8081',
//           },
//           handlerTimeout: 300000,
//         },
//       }),
//     }),
//     PrismaModule,
//     BotModule,
//   ],
// })
// export class AppModule {}


import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { BotModule } from './bot/bot.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        token: config.getOrThrow<string>('BOT_TOKEN'),
        options: {
          telegram: {
            apiRoot: 'http://localhost:8081',
          },
          handlerTimeout: 300000,
        },
      }),
    }),
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    PrismaModule,
    BotModule,
  ],
})
export class AppModule {}